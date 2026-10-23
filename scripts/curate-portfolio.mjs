// Reapply the October 2026 additions and reviewed duplicate decisions after an import.
// Source originals stay in Downloads; only optimized exhibition assets are written.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
const root = new URL('../', import.meta.url).pathname;
const downloads = process.argv[2] || '/home/n1tz/Downloads';
const collections = JSON.parse(await readFile(join(root, 'src/content.json'), 'utf8'));
const additions = {
  personal: [
    ['personal-ds3', 'ds3.jpg', 'Dark Souls III'],
    ['personal-fun1', 'Fun1.jpg', 'Fun1'],
    ['personal-jiraiya-print', 'JiraiyaPrintform.jpg', 'Jiraiya'],
    ['personal-kuniyoshi', 'kuniyoshi1.jpg', 'Kuniyoshi'],
    ['personal-otani', 'Otani_Furuinosuke.jpg', 'Otani Furuinosuke'],
    ['personal-comp', 'comp.jpg', 'Comp'],
  ],
  professional: [
    ['professional-shirt-back', 'ShirtBackFinal_0_fe7fa756-cc9f-4942-9046-7822d3523161_1800x.webp', 'Shirt back design'],
    ['professional-poster01', 'POSTER01s.png', 'Poster design'],
  ],
  logos: [
    ['logos-akiba-wow', 'DAYMU3.png', 'AKIBA WOW'],
    ['logos-cellar-mockup', 'cellarlogomockup.png', 'CELLAR — logo mockup'],
    ['logos-cellar', 'cellarlogo.png', 'CELLAR — logo studies'],
    ['logos-akiba-verse', 'Asset_12x.png', 'AKIBA-VERSE'],
    ['logos-akiba-day-night', 'SPLITMU4.png', 'AKIBA WOW — day and night'],
  ],
};
// Visually reviewed artwork matches, including cropped Instagram versions.
const replacements = {
  'personal-10': 'personal-01',
  'personal-05': 'personal-jiraiya-print',
  'instagram-CWoHLlLJ5Lr': 'personal-02',
  'instagram-CVdT2YgJrTW': 'personal-kuniyoshi',
  'instagram-CXlr3jtuo6q': 'personal-otani',
  'instagram-CXKZlkSJ7uH': 'personal-comp',
};
for (const collection of collections) {
  const featured = [];
  for (const [id, source, title] of additions[collection.id] || []) {
    const input = join(downloads, source);
    const metadata = await sharp(input).rotate().metadata();
    for (const [suffix, size, quality] of [['', 2000, 90], ['-thumb', 640, 84]]) {
      await sharp(input).rotate().resize(size, size, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality }).toFile(join(root, `public/art/${id}${suffix}.webp`));
    }
    const old = collection.items.find(item => item.id === id);
    featured.push({ ...old, id, source, title, alt: title, origin: 'local-curated',
      src: `/art/${id}.webp`, thumb: `/art/${id}-thumb.webp`,
      width: metadata.autoOrient.width, height: metadata.autoOrient.height });
  }
  const featuredIds = new Set(featured.map(item => item.id));
  const items = [...featured, ...collection.items.filter(item => !featuredIds.has(item.id))];
  for (const item of items) {
    const target = items.find(candidate => candidate.id === replacements[item.id]);
    if (target && item.url && !target.url) target.url = item.url;
  }
  const remaining = items.filter(item => !replacements[item.id] && !featuredIds.has(item.id));
  // Order non-featured personal work by usable source detail; never upscale small pieces.
  if (collection.id === 'personal') remaining.sort((a, b) => Math.min(b.width, b.height) - Math.min(a.width, a.height));
  collection.items = [...featured, ...remaining];
  if (collection.id === 'professional') {
    const poster = collection.items.splice(collection.items.findIndex(item => item.id === 'professional-poster01'), 1)[0];
    collection.items.splice(3, 0, poster);
  }
}
await writeFile(join(root, 'src/content.json'), JSON.stringify(collections, null, 2) + '\n');
const importedPath = join(root, 'src/imported-work.json');
const imported = JSON.parse(await readFile(importedPath, 'utf8'));
for (const key of Object.keys(imported)) imported[key] = imported[key].filter(item => !replacements[item.id]);
await writeFile(importedPath, JSON.stringify(imported, null, 2) + '\n');
console.log('Curated', collections.map(c => `${c.id}: ${c.items.length}`).join(', '));
