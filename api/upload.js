import { send, guard, github, fail, readJson, config } from './_lib.js';

// Stores one already-resized image as a Git blob. Publishing later places it in the tree.
// Vercel limits request bodies to about 4.5 MB, so the editor resizes images before sending.
export default async function handler(req, res) {
  if (!guard(req, res, { write: true })) return;
  try {
    const { data } = await readJson(req);
    if (typeof data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return send(res, 400, { error: 'Expected base64 image data.' });
    const bytes = Buffer.from(data, 'base64');
    const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    if (!webp && !jpeg) return send(res, 400, { error: 'Only WebP or JPEG uploads are accepted.' });
    const blob = await github(`/repos/${config.repo}/git/blobs`, { method: 'POST', body: { content: data, encoding: 'base64' } });
    send(res, 200, { sha: blob.sha });
  } catch (error) { fail(res, error); }
}
