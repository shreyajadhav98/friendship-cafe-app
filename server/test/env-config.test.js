const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getConfig } = require('../src/config/env');

test('deployment config reads MongoDB Atlas and Vercel client origins from environment', () => {
  const names = ['NODE_ENV', 'MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL', 'CORS_ORIGIN', 'PORT'];
  const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster.example.mongodb.net/friendship_cafe';
    process.env.JWT_SECRET = 'production-test-secret-with-at-least-thirty-two-characters';
    process.env.CLIENT_URL = 'https://friendship-cafe.vercel.app,https://preview-friendship-cafe.vercel.app';
    process.env.CORS_ORIGIN = 'https://legacy.example';
    process.env.PORT = '10000';
    const config = getConfig();
    assert.equal(config.mongoUri, process.env.MONGODB_URI);
    assert.deepEqual(config.corsOrigin, ['https://friendship-cafe.vercel.app', 'https://preview-friendship-cafe.vercel.app']);
    assert.equal(config.port, 10000);
  } finally {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
});
