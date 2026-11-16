import { apiRequest } from './api';

let cachedToken = '';
let cachedTokenExpiry = 0;

export async function getCustomerSessionToken() {
  if (cachedToken && cachedTokenExpiry > Date.now() + 30_000) return cachedToken;
  const { token, expiresInSeconds } = await apiRequest('/api/auth/session-token', { cache: 'no-store' });
  if (!token || typeof token !== 'string') throw new Error('Customer session could not be verified. Refresh the page and try again.');
  cachedToken = token;
  cachedTokenExpiry = Date.now() + Math.max(60, Number(expiresInSeconds) || 1200) * 1000;
  return cachedToken;
}
