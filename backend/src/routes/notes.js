const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Note = require('../models/Note');
const User = require('../models/User');

// create note
router.post('/', auth, async (req, res) => {
  const { title, content } = req.body;
  const note = await Note.create({ title, content, owner: req.user._id });
  res.json(note);
});

// list owned + shared (simple)
router.get('/', auth, async (req, res) => {
  const owned = await Note.find({ owner: req.user._id, isDeleted: false });
  const shared = await Note.find({ 'sharedWith.user': req.user._id, isDeleted: false });
  res.json({ owned, shared });
});

// get single note (permission check)
router.get('/:id', auth, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note || note.isDeleted) return res.status(404).json({ message: 'not found' });

  const isOwner = note.owner.equals(req.user._id);
  const sharedEntry = note.sharedWith.find(s => s.user.equals(req.user._id));
  if (!isOwner && !sharedEntry) return res.status(403).json({ message: 'forbidden' });

  res.json(note);
});

// update (owner or editor)
router.patch('/:id', auth, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ message: 'not found' });

  const isOwner = note.owner.equals(req.user._id);
  const sharedEntry = note.sharedWith.find(s => s.user.equals(req.user._id));
  const canEdit = isOwner || (sharedEntry && sharedEntry.role === 'editor');
  if (!canEdit) return res.status(403).json({ message: 'forbidden' });

  const { title, content } = req.body;
  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  await note.save();
  res.json(note);
});

// delete (owner only - soft delete)
router.delete('/:id', auth, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ message: 'not found' });
  if (!note.owner.equals(req.user._id)) return res.status(403).json({ message: 'forbidden' });
  note.isDeleted = true;
  await note.save();
  res.json({ ok: true });
});

// share note (owner only)
router.post('/:id/share', auth, async (req, res) => {
  const { email, role } = req.body;
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ message: 'not found' });
  if (!note.owner.equals(req.user._id)) return res.status(403).json({ message: 'forbidden' });

  const userToShare = await User.findOne({ email });
  if (!userToShare) return res.status(404).json({ message: 'user to invite not found' });

  // upsert share entry
  const idx = note.sharedWith.findIndex(s => s.user.equals(userToShare._id));
  if (idx === -1) {
    note.sharedWith.push({ user: userToShare._id, role: role === 'editor' ? 'editor' : 'viewer' });
  } else {
    note.sharedWith[idx].role = role === 'editor' ? 'editor' : 'viewer';
  }
  await note.save();

  // TODO: send email invite (nodemailer) - implement later
  res.json({ ok: true, note });
});

module.exports = router;
