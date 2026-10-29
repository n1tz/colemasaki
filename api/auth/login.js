import { redirect, cookie, origin, randomToken } from '../_lib.js';

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) { res.statusCode = 500; res.end('GITHUB_CLIENT_ID is not configured.'); return; }
  const state = randomToken();
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: `${origin(req)}/api/auth/callback`, state, allow_signup: 'false' });
  redirect(res, `https://github.com/login/oauth/authorize?${params}`, [cookie(req, 'oauth_state', state, 600)]);
}
