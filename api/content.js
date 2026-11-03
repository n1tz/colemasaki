import { send, guard, github, fail, readSite, config } from './_lib.js';

const decode = file => JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  try {
    const repo = `/repos/${config.repo}`;
    const [file, site] = await Promise.all([github(`${repo}/contents/src/content.json?ref=${config.branch}`), readSite(repo, config.branch)]);
    send(res, 200, { sha: file.sha, content: decode(file), siteSha: site?.sha ?? null, site: site ? decode(site) : {} });
  } catch (error) { fail(res, error); }
}
