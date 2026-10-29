import { send, guard, github, fail, config } from './_lib.js';

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  try {
    const file = await github(`/repos/${config.repo}/contents/src/content.json?ref=${config.branch}`);
    send(res, 200, { sha: file.sha, content: JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')) });
  } catch (error) { fail(res, error); }
}
