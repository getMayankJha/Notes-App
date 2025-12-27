const { Server } = require('socket.io');
const jwtUtils = require('./utils/jwt');
const Note = require('./models/Note');

const rooms = new Map(); // noteId -> Map(socketId -> { userId, name })

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: true, credentials: true }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('auth required'));
    try {
      const payload = jwtUtils.verifyToken(token);
      socket.userId = payload.sub;
      return next();
    } catch (err) {
      return next(new Error('invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('socket connected', socket.id, 'user', socket.userId);

    socket.on('join-note', async ({ noteId }) => {
      try {
        const note = await Note.findById(noteId);
        if (!note) return socket.emit('error', 'note not found');

        // basic permission check: owner or sharedWith
        const isOwner = note.owner.equals(socket.userId);
        const sharedEntry = note.sharedWith.find(s => s.user.equals(socket.userId));
        if (!isOwner && !sharedEntry) return socket.emit('error', 'no access');

        socket.join(`note:${noteId}`);

        // maintain active list
        let map = rooms.get(noteId);
        if (!map) {
          map = new Map();
          rooms.set(noteId, map);
        }
        map.set(socket.id, { userId: socket.userId });

        // send init content
        socket.emit('init-content', { content: note.content });

        // broadcast active collaborators
        const active = Array.from(map.values()).map(x => ({ userId: x.userId }));
        io.to(`note:${noteId}`).emit('collaborators', { active });
      } catch (err) {
        console.error(err);
        socket.emit('error', 'join failed');
      }
    });

    socket.on('leave-note', ({ noteId }) => {
      socket.leave(`note:${noteId}`);
      const map = rooms.get(noteId);
      if (map) {
        map.delete(socket.id);
        io.to(`note:${noteId}`).emit('collaborators', { active: Array.from(map.values()) });
      }
    });

    // naive: client sends full content patches or final content
    socket.on('op', async ({ noteId, content }) => {
      // validate permission quickly
      const note = await Note.findById(noteId);
      if (!note) return;
      const isOwner = note.owner.equals(socket.userId);
      const sharedEntry = note.sharedWith.find(s => s.user.equals(socket.userId));
      const canEdit = isOwner || (sharedEntry && sharedEntry.role === 'editor');
      if (!canEdit) return socket.emit('error', 'no edit permission');

      // broadcast to others
      socket.to(`note:${noteId}`).emit('remote-op', { userId: socket.userId, content });

      // optionally persist content (could debounce on client)
      note.content = content;
      await note.save();
    });

    socket.on('cursor-update', ({ noteId, cursor }) => {
      socket.to(`note:${noteId}`).emit('cursor-broadcast', { userId: socket.userId, cursor });
    });

    socket.on('disconnecting', () => {
      // cleanup rooms map entries
      for (const room of socket.rooms) {
        if (!room.startsWith('note:')) continue;
        const noteId = room.split(':')[1];
        const map = rooms.get(noteId);
        if (map) {
          map.delete(socket.id);
          io.to(room).emit('collaborators', { active: Array.from(map.values()) });
        }
      }
    });
  });

  console.log('Socket.io initialized');
}

module.exports = { initSocket };
