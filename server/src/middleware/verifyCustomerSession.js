const jwt = require('jsonwebtoken');
const { getConfig } = require('../config/env');

function verifyCustomerSession(req, res, next) {
  const token = req.get('x-customer-session') || '';
  if (!token) return res.status(403).json({ error: 'Customer session verification is required. Refresh the page and try again.' });
  try {
    const payload = jwt.verify(token, getConfig().jwtSecret, { algorithms: ['HS256'] });
    if (payload.purpose !== 'customer-action') return res.status(403).json({ error: 'Invalid customer session token' });
    req.customerSession = payload;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return res.status(403).json({ error: 'Customer session expired. Refresh the page and try again.' });
    return next(error);
  }
}

module.exports = { verifyCustomerSession };
