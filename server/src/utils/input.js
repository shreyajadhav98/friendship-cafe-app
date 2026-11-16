const htmlPattern = /<\/?[a-z][^>]*>/gi;
const controlPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function sanitizeText(value, { maxLength = 2000, minLength = 0, field = 'Text' } = {}) {
  if (typeof value !== 'string') throw new TypeError(`${field} must be a string`);
  if (/<script\b|javascript\s*:|\bon\w+\s*=|data\s*:\s*text\/html/i.test(value)) throw new TypeError(`${field} contains unsupported markup`);
  const sanitized = value.replace(controlPattern, '').replace(htmlPattern, '').replace(/&(?:lt|gt|quot|#39|amp);/gi, ' ').trim();
  if (sanitized.length < minLength) throw new RangeError(`${field} must be at least ${minLength} characters`);
  if (sanitized.length > maxLength) throw new RangeError(`${field} must be ${maxLength} characters or fewer`);
  return sanitized;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(value, allowedKeys) {
  return isPlainObject(value) && Object.keys(value).every((key) => allowedKeys.includes(key) && !key.startsWith('$') && !key.includes('.'));
}

function validateIndianMobile(value) {
  return typeof value === 'string' && /^[6-9]\d{9}$/.test(value.trim());
}

module.exports = { sanitizeText, isPlainObject, hasOnlyKeys, validateIndianMobile };
