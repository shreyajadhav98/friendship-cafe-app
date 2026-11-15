const dotenv = require('dotenv');

dotenv.config();

function getConfig() {
  const jwtSecret = process.env.JWT_SECRET;
  const mongoUri = process.env.MONGODB_URI;
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (process.env.NODE_ENV === 'production' && (!jwtSecret || jwtSecret.length < 32 || /replace-with|change-me|example/i.test(jwtSecret))) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production');
  }
  if (!jwtSecret) throw new Error('JWT_SECRET is required. Copy .env.example to .env and set it.');
  if (!mongoUri) throw new Error('MONGODB_URI is required. Configure the MongoDB Atlas connection string in the deployment environment.');
  const clientOrigins = (process.env.CLIENT_URL || process.env.CORS_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (nodeEnv === 'production' && clientOrigins.length === 0) throw new Error('CLIENT_URL is required in production to allow the deployed frontend origin.');
  return {
    nodeEnv,
    port: Number(process.env.PORT) || 4000,
    mongoUri,
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
    corsOrigin: clientOrigins
  };
}

module.exports = { getConfig };
