import { redirect, cookie } from '../_lib.js';

export default function handler(req, res) {
  redirect(res, '/admin/', [cookie(req, 'admin_session', '', 0)]);
}
