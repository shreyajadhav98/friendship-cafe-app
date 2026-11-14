function isPrivateIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [first, second] = parts;
  return first === 10 || first === 192 && second === 168 || first === 172 && second >= 16 && second <= 31;
}

function isLanDevelopmentOrigin(origin, nodeEnv = 'development') {
  if (nodeEnv === 'production') return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || url.port !== '5173') return false;
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    return isPrivateIpv4(hostname) || hostname === 'localhost' || hostname.endsWith('.local');
  } catch { return false; }
}

function createOriginValidator(config) {
  return (origin, callback) => {
    const allowed = !origin || config.corsOrigin.includes('*') || config.corsOrigin.includes(origin) || isLanDevelopmentOrigin(origin, config.nodeEnv);
    callback(allowed ? null : new Error('Origin is not allowed by CORS'), allowed);
  };
}

module.exports = { isPrivateIpv4, isLanDevelopmentOrigin, createOriginValidator };
