const jwtUtils = require('../utils/jwt');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ message: 'missing token' });

  const token = header.split(' ')[1];
  try {
    const payload = jwtUtils.verifyToken(token);
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user) return res.status(401).json({ message: 'user not found' });
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'invalid token' });
  }
}

module.exports = authMiddleware;
