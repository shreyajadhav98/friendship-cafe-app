const express = require('express');
const cors = require('cors');
const path = require('path');
const { getConfig } = require('./config/env');
const { createOriginValidator } = require('./config/cors');
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const billingRoutes = require('./routes/billing');
const confessionRoutes = require('./routes/confessions');
const { router: qrCodesRoutes, getQrOutputDirectory, describeQrFile } = require('./routes/qrCodes');

function createApp() {
  const config = getConfig();
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: createOriginValidator(config), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/confessions', confessionRoutes);
  app.use('/api/admin/qr-codes', qrCodesRoutes);
  app.get('/generated-qr/:filename', (req, res, next) => {
    const filename = req.params.filename;
    if (path.basename(filename) !== filename || !describeQrFile(filename)) return res.status(404).json({ error: 'QR asset not found' });
    res.set('Cache-Control', 'public, max-age=300');
    return res.sendFile(path.join(getQrOutputDirectory(), filename), (error) => { if (error && !res.headersSent) next(error); });
  });
  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' });
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) return res.status(400).json({ error: 'Malformed JSON request body' });
    if (error.message === 'Origin is not allowed by CORS') return res.status(403).json({ error: 'Origin is not allowed by CORS' });
    if (error.name === 'ValidationError' || error.name === 'CastError' || error.code === 11000) {
      return res.status(400).json({ error: error.code === 11000 ? 'A record with that unique value already exists' : error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

module.exports = { createApp };
