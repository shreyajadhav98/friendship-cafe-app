const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConfig } = require('../config/env');
const { User } = require('../models');
const { authenticate } = require('../middleware/authenticate');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const loginLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 8, message: 'Too many sign-in attempts. Please wait 15 minutes and try again.' });
const sessionLimiter = createRateLimiter({ windowMs: 60_000, max: 60, message: 'Too many session requests. Please refresh and try again shortly.' });

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || username.length > 80 || !password || password.length > 128 || /[\r\n\u0000]/.test(username)) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const user = await User.findOne({ username: username.trim() }).select('+passwordHash');
    if (!user || user.role !== 'admin' || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const config = getConfig();
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { algorithm: 'HS256', expiresIn: config.jwtExpiresIn });
    return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) { return next(error); }
});

router.get('/session-token', sessionLimiter, (req, res) => {
  const config = getConfig();
  const token = jwt.sign({ purpose: 'customer-action' }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '20m' });
  res.set('Cache-Control', 'no-store');
  return res.json({ token, expiresInSeconds: 1200 });
});

router.get('/me', authenticate, (req, res) => res.json({ user: { id: req.user.id, username: req.user.username, role: req.user.role } }));

module.exports = router;
