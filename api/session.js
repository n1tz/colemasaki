import { send, session } from './_lib.js';

export default function handler(req, res) {
  let current = null;
  try { current = session(req); } catch (error) { return send(res, 500, { error: error.message }); }
  send(res, current ? 200 : 401, current ? { login: current.login } : { error: 'Sign in required.' });
}
