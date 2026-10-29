// Shared helpers for the /admin editor's serverless functions.
// Files prefixed with _ are not exposed as routes by Vercel.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const config = {
  repo: process.env.GITHUB_REPO || 'n1tz/colemasaki',
  branch: process.env.GITHUB_BRANCH || 'main',
  admin: (process.env.ADMIN_GITHUB_LOGIN || 'n1tz').toLowerCase(),
};
const SESSION_DAYS = 14;

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
export function redirect(res, location, cookies = []) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', 'no-store');
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.end();
}

export function origin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}
export function cookie(req, name, value, maxAge) {
  const secure = origin(req).startsWith('https:') ? '; Secure' : '';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
export function readCookie(req, name) {
  const match = (req.headers.cookie || '').split(/;\s*/).find(part => part.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
export const randomToken = () => randomBytes(24).toString('base64url');

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET is missing or shorter than 32 characters.');
  return value;
}
const sign = data => createHmac('sha256', secret()).update(data).digest('base64url');

export function sessionCookie(req, login) {
  const data = Buffer.from(JSON.stringify({ login, exp: Date.now() + SESSION_DAYS * 864e5 })).toString('base64url');
  return cookie(req, 'admin_session', `${data}.${sign(data)}`, SESSION_DAYS * 86400);
}
export function session(req) {
  const value = readCookie(req, 'admin_session');
  if (!value) return null;
  const [data, signature] = value.split('.');
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data)), actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString());
    return parsed.exp > Date.now() && parsed.login?.toLowerCase() === config.admin ? parsed : null;
  } catch { return null; }
}

// Every editor endpoint calls this first. Writes also require a same-origin JSON request.
export function guard(req, res, { write = false } = {}) {
  let ok;
  try { ok = session(req); } catch (error) { send(res, 500, { error: error.message }); return false; }
  if (!ok) { send(res, 401, { error: 'Sign in required.' }); return false; }
  if (write) {
    if (req.method !== 'POST') { send(res, 405, { error: 'POST required.' }); return false; }
    const from = req.headers.origin;
    if ((from && from !== origin(req)) || req.headers['x-admin-request'] !== '1') { send(res, 403, { error: 'Cross-site request refused.' }); return false; }
  }
  return true;
}

export async function readJson(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

export class GitHubError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export async function github(path, { method = 'GET', body } = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new GitHubError('GITHUB_TOKEN is not configured.', 500);
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'colemasaki-editor', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const hint = response.status === 401 ? ' The GitHub token may have expired; create a new one and update GITHUB_TOKEN in Vercel.' : '';
    throw new GitHubError(`GitHub ${method} ${path.split('?')[0]} failed (${response.status}): ${data?.message || 'unknown error'}.${hint}`, response.status);
  }
  return data;
}
export function fail(res, error) {
  send(res, error instanceof GitHubError && error.status < 500 ? 502 : 500, { error: error.message });
}
