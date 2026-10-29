import { send, guard, github, fail, readJson, config } from './_lib.js';

const ART = /^\/art\/[A-Za-z0-9_-]+\.(webp|jpe?g|png)$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/;
const text = (value, max) => typeof value === 'string' && value.length <= max;
const https = value => typeof value === 'string' && /^https:\/\/[^\s"'<>]+$/.test(value) && value.length <= 600;

class Invalid extends Error {}
const check = (ok, message) => { if (!ok) throw new Invalid(message); };

// Collections, labels and file paths come from the repository. The editor can only
// order items, move them, edit their title/alt/link/showcase flag, remove them, and add uploaded images.
function merge(current, incoming, uploads) {
  check(Array.isArray(incoming) && incoming.length === current.length, 'Collections cannot be added or removed.');
  const known = new Map(current.flatMap(c => c.items.map(item => [item.id, { item, collection: c.id }])));
  const seen = new Set();
  return current.map((collection, ci) => {
    const next = incoming[ci];
    check(next?.id === collection.id && Array.isArray(next.items), `Collection order changed: ${collection.id}.`);
    const items = next.items.map((item, index) => {
      check(item && ID.test(item.id) && !seen.has(item.id), `Invalid or duplicate item id: ${item?.id}.`);
      seen.add(item.id);
      check(item.alt === undefined || text(item.alt, 500), `Alt text too long: ${item.id}.`);
      check(item.title === undefined || item.title === '' || text(item.title, 200), `Title too long: ${item.id}.`);
      check(!item.url || https(item.url), `Links must start with https:// (${item.id}).`);
      const previous = known.get(item.id);
      let result;
      if (previous) {
        check(previous.collection !== 'fonts' || collection.id === 'fonts', 'Fonts cannot be moved to another collection.');
        result = { ...previous.item };
      } else {
        check(collection.id !== 'fonts', 'New fonts can only be added by editing the code.');
        check(ART.test(item.src) && ART.test(item.thumb), `Invalid image path: ${item.id}.`);
        check(uploads.has(item.src) && uploads.has(item.thumb), `Image for ${item.id} was not uploaded.`);
        check(Number.isInteger(item.width) && Number.isInteger(item.height) && item.width > 0 && item.height > 0, `Invalid size: ${item.id}.`);
        result = { id: item.id, source: text(item.source, 200) ? item.source : '', src: item.src, thumb: item.thumb, width: item.width, height: item.height };
        if (item.type === 'video') {
          check(/^[\w-]{11}$/.test(item.youtube), 'Invalid YouTube video id.');
          Object.assign(result, { type: 'video', youtube: item.youtube });
        }
      }
      if (result.type === 'video') check(collection.id === 'game' && index === 0, 'The video must be the first item in Video Game.');
      for (const key of ['title', 'alt', 'url']) {
        if (item[key]) result[key] = item[key].trim(); else if (key !== 'alt') delete result[key];
      }
      if (item.showcase === false) result.showcase = false; else delete result.showcase;
      if (!result.alt) result.alt = result.title || `${collection.label}, work ${index + 1}`;
      return result;
    });
    const merged = { ...collection, items };
    if (collection.id === 'game') {
      check(!next.storeUrl || https(next.storeUrl), 'The store URL must start with https://.');
      if (next.storeUrl) merged.storeUrl = next.storeUrl.trim(); else delete merged.storeUrl;
    }
    return merged;
  });
}
const artPaths = content => new Set(content.flatMap(c => c.items.flatMap(i => [i.src, i.thumb])).filter(p => ART.test(p)));

export default async function handler(req, res) {
  if (!guard(req, res, { write: true })) return;
  try {
    const { baseSha, content, files = [] } = await readJson(req);
    check(Array.isArray(files) && files.every(f => ART.test('/' + String(f.path).replace(/^public\//, '')) && String(f.path).startsWith('public/art/') && /^[0-9a-f]{40}$/.test(f.sha)), 'Invalid upload list.');
    const repo = `/repos/${config.repo}`;
    const ref = await github(`${repo}/git/ref/heads/${config.branch}`);
    const head = await github(`${repo}/git/commits/${ref.object.sha}`);
    const file = await github(`${repo}/contents/src/content.json?ref=${ref.object.sha}`);
    if (file.sha !== baseSha) return send(res, 409, { error: 'The site changed since you opened the editor. Reload to get the latest version, then redo your changes.' });
    const current = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    const uploads = new Set(files.map(f => f.path.replace(/^public/, '')));
    const next = merge(current, content, uploads);
    const used = artPaths(next), before = artPaths(current);
    const tree = [
      { path: 'src/content.json', mode: '100644', type: 'blob', content: JSON.stringify(next, null, 2) + '\n' },
      ...files.filter(f => used.has(f.path.replace(/^public/, ''))).map(f => ({ path: f.path, mode: '100644', type: 'blob', sha: f.sha })),
      // Images no longer used anywhere are removed from the repository too.
      ...[...before].filter(p => !used.has(p)).map(p => ({ path: `public${p}`, mode: '100644', type: 'blob', sha: null })),
    ];
    const newTree = await github(`${repo}/git/trees`, { method: 'POST', body: { base_tree: head.tree.sha, tree } });
    const commit = await github(`${repo}/git/commits`, { method: 'POST', body: { message: 'Update portfolio content from the editor', tree: newTree.sha, parents: [head.sha] } });
    await github(`${repo}/git/refs/heads/${config.branch}`, { method: 'PATCH', body: { sha: commit.sha } });
    // Vercel's Git integration does not deploy commits created through the API, so ask it directly.
    const hook = process.env.DEPLOY_HOOK_URL;
    const deploying = hook ? (await fetch(hook, { method: 'POST' }).catch(() => null))?.ok ?? false : false;
    send(res, 200, { commit: commit.sha, url: `https://github.com/${config.repo}/commit/${commit.sha}`, deploying });
  } catch (error) {
    if (error instanceof Invalid || error instanceof SyntaxError) return send(res, 400, { error: error.message });
    fail(res, error);
  }
}
