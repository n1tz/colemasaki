import { send, guard, github, fail, readJson, readSite, config } from './_lib.js';

const ART = /^\/art\/[A-Za-z0-9_-]+\.(webp|jpe?g|png)$/;
const RESUME = /^\/resume\/[A-Za-z0-9_-]+\.pdf$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/;
const text = (value, max) => typeof value === 'string' && value.length <= max;
const https = value => typeof value === 'string' && /^https:\/\/[^\s"'<>]+$/.test(value) && value.length <= 600;

class Invalid extends Error {}
const check = (ok, message) => { if (!ok) throw new Invalid(message); };

// Collection ids and file paths come from the repository. The editor can reorder, rename, describe
// and hide collections; order items, move them, edit their title/alt/description/link/showcase flag,
// remove them, and add uploaded images.
function merge(current, incoming, uploads) {
  check(Array.isArray(incoming) && incoming.length === current.length, 'Collections cannot be added or removed.');
  const byId = new Map(current.map(c => [c.id, c]));
  check(new Set(incoming.map(c => c?.id)).size === current.length && incoming.every(c => byId.has(c?.id)), 'Collections cannot be added, removed or renamed by id.');
  check(incoming.some(c => !c.hidden), 'At least one collection must stay visible.');
  const known = new Map(current.flatMap(c => c.items.map(item => [item.id, { item, collection: c.id }])));
  const seen = new Set();
  return incoming.map(next => {
    const collection = byId.get(next.id);
    check(Array.isArray(next.items), `Invalid collection: ${collection.id}.`);
    const label = typeof next.label === 'string' ? next.label.trim() : '';
    check(label && label.length <= 60, `Collection names must be 1–60 characters (${collection.id}).`);
    check(next.shortLabel === undefined || text(next.shortLabel, 24), `Short names must be at most 24 characters (${collection.id}).`);
    check(next.intro === undefined || text(next.intro, 300), `Collection intro too long (${collection.id}).`);
    const items = next.items.map((item, index) => {
      check(item && ID.test(item.id) && !seen.has(item.id), `Invalid or duplicate item id: ${item?.id}.`);
      seen.add(item.id);
      check(item.alt === undefined || text(item.alt, 500), `Alt text too long: ${item.id}.`);
      check(item.title === undefined || item.title === '' || text(item.title, 200), `Title too long: ${item.id}.`);
      check(item.description === undefined || text(item.description, 3000), `Description too long: ${item.id}.`);
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
      for (const key of ['title', 'alt', 'url', 'description']) {
        const value = typeof item[key] === 'string' ? item[key].trim() : '';
        if (value) result[key] = key === 'description' ? value.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n') : value;
        else if (key !== 'alt') delete result[key];
      }
      if (item.showcase === false) result.showcase = false; else delete result.showcase;
      if (!result.alt) result.alt = result.title || `${label}, work ${index + 1}`;
      return result;
    });
    const merged = { ...collection, label, items };
    for (const key of ['shortLabel', 'intro']) {
      const value = next[key]?.trim();
      if (value) merged[key] = value; else delete merged[key];
    }
    if (next.hidden === true) merged.hidden = true; else delete merged.hidden;
    if (collection.id === 'game') {
      check(!next.storeUrl || https(next.storeUrl), 'The store URL must start with https://.');
      if (next.storeUrl) merged.storeUrl = next.storeUrl.trim(); else delete merged.storeUrl;
    }
    return merged;
  });
}
// Site-wide text lives in src/site.json so content.json stays a plain list of collections.
const SITE_TEXT = { tagline: 40, subtitle: 80, headerLine: 80 };
function mergeSite(current, incoming) {
  if (incoming === undefined) return current;
  check(incoming && typeof incoming === 'object' && !Array.isArray(incoming), 'Invalid site settings.');
  const next = { ...current };
  for (const [key, max] of Object.entries(SITE_TEXT)) {
    if (incoming[key] === undefined) continue;
    check(text(incoming[key], max), `Site setting “${key}” must be at most ${max} characters.`);
    if (incoming[key].trim()) next[key] = incoming[key].trim(); else delete next[key];
  }
  if (incoming.instagram !== undefined) {
    check(!incoming.instagram || https(incoming.instagram), 'The Instagram link must start with https://.');
    if (incoming.instagram) next.instagram = incoming.instagram.trim(); else delete next.instagram;
  }
  if (incoming.about !== undefined) next.about = mergeAbout(current.about || {}, incoming.about);
  if (next.about && !Object.keys(next.about).length) delete next.about;
  return next;
}
// The About section; empty fields are dropped so the site hides them.
const ABOUT_TEXT = { location: 120, project: 2000, education: 2000, role: 120, status: 200, intro: 4000, experience: 2000, skills: 2000 };
function mergeAbout(current, incoming) {
  check(incoming && typeof incoming === 'object' && !Array.isArray(incoming), 'Invalid About section.');
  const next = { ...current };
  const set = (key, value) => { const clean = value.replace(/\r\n?/g, '\n').trim(); if (clean) next[key] = clean; else delete next[key]; };
  for (const [key, max] of Object.entries(ABOUT_TEXT)) {
    if (incoming[key] === undefined) continue;
    check(text(incoming[key], max), `About “${key}” must be at most ${max} characters.`);
    set(key, incoming[key]);
  }
  if (incoming.email !== undefined) {
    check(text(incoming.email, 120) && (!incoming.email.trim() || /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(incoming.email.trim())), 'The contact email is not valid.');
    set('email', incoming.email);
  }
  if (incoming.resume !== undefined) {
    check(text(incoming.resume, 600) && (!incoming.resume.trim() || https(incoming.resume.trim()) || /^\/resume\/[A-Za-z0-9_-]+\.pdf$/.test(incoming.resume.trim())), 'Use an https:// résumé link or /resume/filename.pdf.');
    set('resume', incoming.resume);
  }
  return next;
}
const artPaths = content => new Set(content.flatMap(c => c.items.flatMap(i => [i.src, i.thumb])).filter(p => ART.test(p)));

export default async function handler(req, res) {
  if (!guard(req, res, { write: true })) return;
  try {
    const { baseSha, siteSha = null, content, site, files = [] } = await readJson(req);
    check(Array.isArray(files) && files.every(f => f && typeof f.path === 'string' && f.path.startsWith('public/') && (ART.test(f.path.slice(6)) || RESUME.test(f.path.slice(6))) && /^[0-9a-f]{40}$/.test(f.sha)), 'Invalid upload list.');
    check(new Set(files.map(f => f.path)).size === files.length, 'Duplicate upload paths.');
    const repo = `/repos/${config.repo}`;
    const ref = await github(`${repo}/git/ref/heads/${config.branch}`);
    const head = await github(`${repo}/git/commits/${ref.object.sha}`);
    const file = await github(`${repo}/contents/src/content.json?ref=${ref.object.sha}`);
    if (file.sha !== baseSha) return send(res, 409, { error: 'The site changed since you opened the editor. Reload to get the latest version, then redo your changes.' });
    const siteFile = await readSite(repo, ref.object.sha);
    if ((siteFile?.sha ?? null) !== siteSha) return send(res, 409, { error: 'The site settings changed since you opened the editor. Reload to get the latest version, then redo your changes.' });
    const current = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    const currentSite = siteFile ? JSON.parse(Buffer.from(siteFile.content, 'base64').toString('utf8')) : {};
    const nextSite = mergeSite(currentSite, site);
    const uploads = new Set(files.map(f => f.path.replace(/^public/, '')));
    const next = merge(current, content, uploads);
    const used = artPaths(next), before = artPaths(current);
    const resume = nextSite.about?.resume, previousResume = currentSite.about?.resume;
    if (RESUME.test(resume)) {
      check(resume === previousResume || uploads.has(resume), 'Upload the résumé PDF before publishing.');
      used.add(resume);
    }
    if (RESUME.test(previousResume)) before.add(previousResume);
    const tree = [
      { path: 'src/content.json', mode: '100644', type: 'blob', content: JSON.stringify(next, null, 2) + '\n' },
      ...(siteFile || Object.keys(nextSite).length ? [{ path: 'src/site.json', mode: '100644', type: 'blob', content: JSON.stringify(nextSite, null, 2) + '\n' }] : []),
      ...files.filter(f => used.has(f.path.replace(/^public/, ''))).map(f => ({ path: f.path, mode: '100644', type: 'blob', sha: f.sha })),
      // Remove replaced images and the previous locally hosted résumé atomically.
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
