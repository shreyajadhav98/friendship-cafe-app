const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { generateQrCodes, getBaseUrl, normalizeTables } = require('../scripts/generate-table-qrs');

test('QR generator writes table and remote links as high-resolution PNG and SVG', async () => {
  const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'friendship-cafe-qr-'));
  try {
    const generated = await generateQrCodes({
      domain: 'https://friendshipcafe.example',
      tables: ['5'],
      includeRemote: true,
      includeMaster: true,
      outputDirectory
    });
    assert.equal(generated.length, 3);
    const tableUrl = new URL(generated[0].url);
    const remoteUrl = new URL(generated[1].url);
    const masterUrl = new URL(generated[2].url);
    assert.equal(tableUrl.searchParams.get('table'), '5');
    assert.equal(remoteUrl.searchParams.get('mode'), 'remote');
    assert.equal(masterUrl.pathname, '/');
    assert.equal(masterUrl.search, '');
    assert.match(generated[2].pngPath, /master-friendship-cafe\.png$/);
    for (const qr of generated) {
      assert.ok((await fs.stat(qr.pngPath)).size > 1000);
      const svg = await fs.readFile(qr.svgPath, 'utf8');
      assert.match(svg, /<svg/);
    }
  } finally {
    await fs.rm(outputDirectory, { recursive: true, force: true });
  }
});

test('QR base URL prefers VITE_APP_URL and rewrites local development URLs to a LAN IP', () => {
  const interfaces = { wifi: [{ address: '192.168.1.25', family: 'IPv4', internal: false }] };
  assert.equal(getBaseUrl(undefined, { appUrl: 'http://localhost:5173/', nodeEnv: 'development', networkInterfaces: interfaces }).href, 'http://192.168.1.25:5173/');
  assert.equal(getBaseUrl(undefined, { nodeEnv: 'development', networkInterfaces: interfaces }).href, 'http://192.168.1.25:5173/');
  assert.equal(getBaseUrl(undefined, { appUrl: 'https://cafe.example/path', nodeEnv: 'production' }).href, 'https://cafe.example/');
  assert.equal(getBaseUrl('http://192.168.1.30:5173/', { nodeEnv: 'development', networkInterfaces: interfaces }).href, 'http://192.168.1.30:5173/');
});

test('QR generator rejects unsafe table identifiers', () => {
  assert.throws(() => normalizeTables(['../../other']), /Invalid table number/);
});

