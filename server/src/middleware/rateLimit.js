function createRateLimiter({ windowMs = 60_000, max = 20, message = 'Too many requests. Please try again later.', key = (req) => req.ip } = {}) {
  const buckets = new Map();
  let lastCleanup = 0;
  return function rateLimit(req, res, next) {
    const now = Date.now();
    if (now - lastCleanup > windowMs) {
      for (const [clientKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(clientKey);
      lastCleanup = now;
    }
    const clientKey = String(key(req) || req.ip || 'unknown');
    let bucket = buckets.get(clientKey);
    if (!bucket || bucket.resetAt <= now) { bucket = { count: 0, resetAt: now + windowMs }; buckets.set(clientKey, bucket); }
    bucket.count += 1;
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.set('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) return res.status(429).json({ error: message });
    return next();
  };
}

function createSocketRateLimiter({ windowMs = 60_000, max = 8 } = {}) {
  const buckets = new Map();
  return (socket, eventName, callback, reject) => {
    const now = Date.now();
    const key = `${socket.handshake.address || socket.id}:${eventName}`;
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return true; }
    current.count += 1;
    if (current.count <= max) return true;
    reject(callback, { ok: false, error: 'Too many order attempts. Please wait before trying again.' });
    return false;
  };
}

module.exports = { createRateLimiter, createSocketRateLimiter };
