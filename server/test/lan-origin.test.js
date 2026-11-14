const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createOriginValidator, isLanDevelopmentOrigin } = require('../src/config/cors');

test('LAN frontend origins are accepted only for local Vite development', () => {
  assert.equal(isLanDevelopmentOrigin('http://192.168.1.23:5173', 'development'), true);
  assert.equal(isLanDevelopmentOrigin('http://10.0.0.8:5173', 'development'), true);
  assert.equal(isLanDevelopmentOrigin('http://192.168.1.23:5173', 'production'), false);
  assert.equal(isLanDevelopmentOrigin('http://192.168.1.23:4000', 'development'), false);
  assert.equal(isLanDevelopmentOrigin('https://public.example:5173', 'development'), false);
});

test('configured CORS origins continue to work alongside development LAN hosts', () => {
  const validate = createOriginValidator({ corsOrigin: ['https://cafe.example'], nodeEnv: 'development' });
  const result = (origin) => new Promise((resolve, reject) => validate(origin, (error, allowed) => error ? reject(error) : resolve(allowed)));
  return Promise.all([
    result('https://cafe.example').then((allowed) => assert.equal(allowed, true)),
    result('http://192.168.1.23:5173').then((allowed) => assert.equal(allowed, true)),
    result('https://attacker.example').then(() => assert.fail('unconfigured origins should be blocked'), (error) => assert.match(error.message, /Origin is not allowed/))
  ]);
});
