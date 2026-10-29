import { redirect, cookie, origin, readCookie, sessionCookie, config } from '../_lib.js';

// Exchanges GitHub's code for the visitor's login. The user token is discarded;
// commits use the separate, repository-scoped GITHUB_TOKEN.
export default async function handler(req, res) {
  const url = new URL(req.url, origin(req));
  const clear = cookie(req, 'oauth_state', '', 0);
  const state = url.searchParams.get('state'), code = url.searchParams.get('code');
  if (!state || state !== readCookie(req, 'oauth_state') || !code) return redirect(res, '/admin/?error=state', [clear]);
  try {
    const exchange = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
    }).then(r => r.json());
    if (!exchange.access_token) return redirect(res, '/admin/?error=exchange', [clear]);
    const user = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${exchange.access_token}`, 'User-Agent': 'colemasaki-editor' } }).then(r => r.json());
    if (user.login?.toLowerCase() !== config.admin) return redirect(res, '/admin/?error=account', [clear]);
    redirect(res, '/admin/', [clear, sessionCookie(req, user.login)]);
  } catch (error) {
    console.error(error);
    redirect(res, '/admin/?error=server', [clear]);
  }
}
