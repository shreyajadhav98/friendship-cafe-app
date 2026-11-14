const dotenv = require('dotenv');

dotenv.config();

function getConfig() {
  const jwtSecret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!jwtSecret || jwtSecret.length < 32 || /replace-with|change-me|example/i.test(jwtSecret))) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production');
  }
  if (!jwtSecret) throw new Error('JWT_SECRET is required. Copy .env.example to .env and set it.');
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 4000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cafe_app',
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
    corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((v) => v.trim())
  };
}

module.exports = { getConfig };
