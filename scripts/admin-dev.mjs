// Runs the /admin editor locally: `GITHUB_TOKEN=$(gh auth token) npm run admin`.
// Sign-in is skipped locally (a session is issued automatically); everything else
// runs the same serverless functions as production. GITHUB_BRANCH targets another branch.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { extname, join, normalize } from 'node:path';

process.env.SESSION_SECRET ||= randomBytes(32).toString('hex');
if (!process.env.GITHUB_TOKEN) { console.error('Set GITHUB_TOKEN, e.g. GITHUB_TOKEN=$(gh auth token) npm run admin'); process.exit(1); }
const { sessionCookie, session, config } = await import('../api/_lib.js');
const root = new URL('..', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.otf': 'font/otf', '.ttf': 'font/ttf' };
const port = Number(process.env.PORT || 4321);

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (!session(req)) res.setHeader('Set-Cookie', sessionCookie(req, config.admin));
  if (path.startsWith('/api/')) {
    if (path.startsWith('/api/auth/')) { res.statusCode = 302; res.setHeader('Location', '/admin/'); return res.end(); }
    try {
      const { default: handler } = await import(join(root, normalize(path).replace(/^\/+/, '') + '.js'));
      if (!req.headers.cookie?.includes('admin_session')) req.headers.cookie = String(res.getHeader('Set-Cookie')).split(';')[0];
      return await handler(req, res);
    } catch (error) { res.statusCode = 404; return res.end(String(error.message)); }
  }
  if (path === '/' || path === '/admin') { res.statusCode = 302; res.setHeader('Location', '/admin/'); return res.end(); }
  const file = join(root, 'public', normalize(path.endsWith('/') ? path + 'index.html' : path));
  if (!file.startsWith(join(root, 'public'))) { res.statusCode = 403; return res.end(); }
  try { res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(await readFile(file)); }
  catch { res.statusCode = 404; res.end('Not found'); }
}).listen(port, () => console.log(`Editor: http://localhost:${port}/admin/  (committing to ${config.repo}@${config.branch})`));
