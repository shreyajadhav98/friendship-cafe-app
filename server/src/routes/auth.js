const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConfig } = require('../config/env');
const { User } = require('../models');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
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

router.get('/me', authenticate, (req, res) => res.json({ user: { id: req.user.id, username: req.user.username, role: req.user.role } }));

module.exports = router;
