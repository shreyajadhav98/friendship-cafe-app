const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

function getQrOutputDirectory() {
  return process.env.QR_OUTPUT_DIR ? path.resolve(process.env.QR_OUTPUT_DIR) : path.join(__dirname, '..', '..', 'generated-qr');
}

function describeQrFile(filename) {
  const match = /^(master-friendship-cafe|remote-ordering|table-[a-z0-9_-]{1,30})\.(png|svg)$/i.exec(filename);
  if (!match) return null;
  const baseName = match[1];
  const label = baseName === 'master-friendship-cafe' ? 'Friendship Café Master QR Code'
    : baseName === 'remote-ordering' ? 'Remote ordering QR'
      : `Table ${baseName.slice('table-'.length)}`;
  return { key: baseName, label, format: match[2].toLowerCase(), filename, url: `/generated-qr/${encodeURIComponent(filename)}` };
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const files = await fs.readdir(getQrOutputDirectory(), { withFileTypes: true }).catch((error) => error.code === 'ENOENT' ? [] : Promise.reject(error));
    const assets = files.filter((entry) => entry.isFile()).map((entry) => describeQrFile(entry.name)).filter(Boolean);
    const codesByKey = new Map();
    for (const asset of assets) {
      const code = codesByKey.get(asset.key) || { key: asset.key, label: asset.label };
      code[asset.format] = asset.url;
      codesByKey.set(asset.key, code);
    }
    const codes = [...codesByKey.values()].sort((left, right) => left.key === 'master-friendship-cafe' ? -1 : right.key === 'master-friendship-cafe' ? 1 : left.key.localeCompare(right.key));
    return res.json({ codes });
  } catch (error) { return next(error); }
});

module.exports = { router, getQrOutputDirectory, describeQrFile };
