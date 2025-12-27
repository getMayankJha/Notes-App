const bcrypt = require('bcrypt');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { signAccessToken, signRefreshToken, REFRESH_EXPIRES } = require('../utils/jwt');
const ms = require('ms');

const COOKIE_NAME = 'refreshToken';

async function register(req, res) {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email & password required' });

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'email already in use' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });

  const accessToken = signAccessToken({ sub: user._id });
  const refreshToken = signRefreshToken({ sub: user._id });

  // store refresh token
  const expiresAt = new Date(Date.now() + (ms(REFRESH_EXPIRES) || 1000 * 60 * 60 * 24 * 30));
  await RefreshToken.create({ user: user._id, token: refreshToken, expiresAt });

  res.cookie(COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    // secure: true, // enable in prod with HTTPS
    maxAge: expiresAt - Date.now()
  });

  res.json({ accessToken, user: { id: user._id, email: user.email, name: user.name } });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'invalid credentials' });

  const accessToken = signAccessToken({ sub: user._id });
  const refreshToken = signRefreshToken({ sub: user._id });

  const expiresAt = new Date(Date.now() + (ms(REFRESH_EXPIRES) || 1000 * 60 * 60 * 24 * 30));
  await RefreshToken.create({ user: user._id, token: refreshToken, expiresAt });

  res.cookie(COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    // secure: true,
    maxAge: expiresAt - Date.now()
  });

  res.json({ accessToken, user: { id: user._id, email: user.email, name: user.name } });
}

async function refresh(req, res) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ message: 'no refresh token' });

  // verify signature
  let payload;
  try {
    payload = require('../utils/jwt').verifyToken(token);
  } catch (err) {
    return res.status(401).json({ message: 'invalid refresh token' });
  }

  // ensure token exists in DB & not revoked
  const stored = await RefreshToken.findOne({ token, revoked: false });
  if (!stored) return res.status(401).json({ message: 'refresh token not found' });

  const accessToken = signAccessToken({ sub: payload.sub });
  res.json({ accessToken });
}

async function logout(req, res) {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    await RefreshToken.findOneAndUpdate({ token }, { revoked: true });
  }
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
}

module.exports = { register, login, refresh, logout };

