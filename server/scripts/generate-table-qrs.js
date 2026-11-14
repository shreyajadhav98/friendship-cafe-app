const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const QRCode = require('qrcode');
const dotenv = require('dotenv');
const shellAppUrl = process.env.VITE_APP_URL;
const serverEnv = dotenv.config({ path: path.join(__dirname, '..', '.env') }).parsed || {};
const clientEnv = dotenv.config({ path: path.join(__dirname, '..', '..', 'client', '.env') }).parsed || {};
if (shellAppUrl) process.env.VITE_APP_URL = shellAppUrl;
else process.env.VITE_APP_URL = serverEnv.VITE_APP_URL || clientEnv.VITE_APP_URL || process.env.VITE_APP_URL || '';

const OUTPUT_DIRECTORY = process.env.QR_OUTPUT_DIR
  ? path.resolve(process.env.QR_OUTPUT_DIR)
  : path.join(__dirname, '..', 'generated-qr');

function getLanIPv4(networkInterfaces = os.networkInterfaces()) {
  const addresses = Object.values(networkInterfaces).flat().filter((entry) => entry && !entry.internal && entry.family === 'IPv4').map((entry) => entry.address);
  const privateAddress = addresses.find((address) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address));
  const address = privateAddress || addresses[0];
  if (!address) throw new Error('Could not find a local IPv4 address. Set VITE_APP_URL in server/.env to the website URL reachable by QR scanners.');
  return address;
}

function getBaseUrl(value, { appUrl = process.env.VITE_APP_URL, domain = process.env.DOMAIN, nodeEnv = process.env.NODE_ENV || 'development', networkInterfaces, useLan = false } = {}) {
  if (useLan && nodeEnv === 'production') throw new Error('The --lan option is for development networks only; configure VITE_APP_URL or DOMAIN for production QR codes');
  let candidate = value || appUrl || domain;
  if (nodeEnv === 'production' && !candidate) throw new Error('Set VITE_APP_URL or DOMAIN in server/.env to the public HTTPS café website origin before generating QR codes');
  if (!candidate) candidate = `http://${getLanIPv4(networkInterfaces)}:5173/`;
  let url;
  try { url = new URL(candidate); } catch { throw new Error('VITE_APP_URL or DOMAIN must be a complete http:// or https:// URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('VITE_APP_URL or DOMAIN must be a complete http:// or https:// URL without credentials');
  const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (useLan) {
    url = new URL(`http://${getLanIPv4(networkInterfaces)}:5173/`);
  } else if (nodeEnv !== 'production' && isLoopback) {
    url.hostname = getLanIPv4(networkInterfaces);
    if (!url.port) url.port = '5173';
  }
  if (nodeEnv === 'production' && url.protocol !== 'https:') throw new Error('Production QR codes require an HTTPS VITE_APP_URL or DOMAIN');
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url;
}

function normalizeTables(values) {
  if (!values.length) throw new Error('Provide one or more table numbers, for example: npm run qr:generate -- 1 2 3');
  return [...new Set(values.map((value) => value.trim()))].map((table) => {
    if (!/^[A-Za-z0-9_-]{1,30}$/.test(table)) throw new Error(`Invalid table number "${table}"; use up to 30 letters, digits, hyphens, or underscores`);
    return table;
  });
}

async function writeQrFiles(targetUrl, name, outputDirectory) {
  const options = { errorCorrectionLevel: 'H', margin: 2, width: 1200, color: { dark: '#2b1b14', light: '#FFFFFF' } };
  const pngPath = path.join(outputDirectory, `${name}.png`);
  const svgPath = path.join(outputDirectory, `${name}.svg`);
  await QRCode.toFile(pngPath, targetUrl, { ...options, type: 'png' });
  await fs.writeFile(svgPath, await QRCode.toString(targetUrl, { ...options, type: 'svg' }), 'utf8');
  return { pngPath, svgPath };
}

async function generateQrCodes({ domain, appUrl, tables = [], includeRemote = false, includeMaster = false, useLan = false, outputDirectory = OUTPUT_DIRECTORY, nodeEnv, networkInterfaces } = {}) {
  const baseUrl = getBaseUrl(domain, { appUrl, nodeEnv, networkInterfaces, useLan });
  const normalizedTables = tables.length ? normalizeTables(tables) : [];
  if (!normalizedTables.length && !includeRemote && !includeMaster) throw new Error('Provide table numbers or pass --master and/or --remote to generate the general-order QR codes');
  await fs.mkdir(outputDirectory, { recursive: true });
  const generated = [];
  for (const table of normalizedTables) {
    const target = new URL(baseUrl.href);
    target.searchParams.set('table', table);
    const files = await writeQrFiles(target.href, `table-${table.toLowerCase()}`, outputDirectory);
    generated.push({ label: `Table ${table}`, url: target.href, ...files });
  }
  if (includeRemote) {
    const target = new URL(baseUrl.href);
    target.searchParams.set('mode', 'remote');
    const files = await writeQrFiles(target.href, 'remote-ordering', outputDirectory);
    generated.push({ label: 'Remote ordering', url: target.href, ...files });
  }
  if (includeMaster) {
    const target = new URL(baseUrl.href);
    const files = await writeQrFiles(target.href, 'master-friendship-cafe', outputDirectory);
    generated.push({ label: 'Friendship Café Master QR Code', url: target.href, ...files });
  }
  return generated;
}

async function main() {
  const args = process.argv.slice(2);
  const includeRemote = args.includes('--remote');
  const includeMaster = args.includes('--master') || args.includes('--general');
  const useLan = args.includes('--lan');
  const flags = new Set(['--remote', '--master', '--general', '--lan']);
  const tables = args.filter((arg) => !flags.has(arg));
  const generated = await generateQrCodes({ tables, includeRemote, includeMaster, useLan });
  for (const qr of generated) {
    console.log(`${qr.label}: ${qr.url}`);
    console.log(`  PNG ${qr.pngPath}`);
    console.log(`  SVG ${qr.svgPath}`);
  }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { getBaseUrl, normalizeTables, generateQrCodes };
