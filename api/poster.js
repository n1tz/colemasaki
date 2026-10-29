import { send, guard } from './_lib.js';

// Fetches a YouTube video's poster frame for the editor (YouTube images can't be read cross-origin).
export default async function handler(req, res) {
  if (!guard(req, res)) return;
  const id = new URL(req.url, 'http://x').searchParams.get('id') || '';
  if (!/^[\w-]{11}$/.test(id)) return send(res, 400, { error: 'Invalid YouTube video id.' });
  for (const name of ['maxresdefault', 'hqdefault']) {
    const response = await fetch(`https://i.ytimg.com/vi/${id}/${name}.jpg`);
    if (!response.ok) continue;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(Buffer.from(await response.arrayBuffer()));
  }
  send(res, 404, { error: 'No poster found. Check that the video exists and is public or unlisted.' });
}
