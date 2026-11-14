const jwt = require('jsonwebtoken');
const { getConfig } = require('../config/env');
const { User } = require('../models');

async function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, getConfig().jwtSecret, { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub).select('_id username role');
    if (!user || user.role !== 'admin') return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Invalid or expired token' });
    next(error);
  }
}

module.exports = { authenticate };
