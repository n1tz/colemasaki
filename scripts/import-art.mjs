import sharp from 'sharp';
import { readdir, mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.argv[2];
if (!root) throw new Error('Usage: npm run import:art -- /path/to/AIFOOD');
const exec = promisify(execFile);
const out = new URL('../public/art/', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const collections = [
  { id: 'personal', label: 'Personal Work', folder: '2DPersonal', items: [] },
  { id: 'logos', label: 'Logo Design', folder: 'Logo', items: [] },
  { id: 'zine', label: 'Zine', folder: 'Zine/PRINT', items: [] },
  { id: 'game', label: 'Video Game', items: [] },
  { id: 'drawings', label: 'Drawings & Paintings', items: [] },
];
for (const collection of collections) {
  if (!collection.folder) continue;
  const names = (await readdir(join(root, collection.folder))).filter(n => /\.(png|jpe?g|ai)$/i.test(n)).sort((a,b) => a.localeCompare(b, 'en', { numeric: true }));
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    // Blank inside covers are omitted from the online edition; preserve source IDs.
    if (collection.id === 'zine' && ['Page02.ai', 'Page19.ai'].includes(name)) continue;
    const id = `${collection.id}-${String(i + 1).padStart(2, '0')}`;
    let source = join(root, collection.folder, name);
    if (name.endsWith('.ai')) {
      const temp = join(tmpdir(), `cole-${id}`);
      await exec('pdftoppm', ['-scale-to', '2000', '-png', '-singlefile', source, temp]);
      source = `${temp}.png`;
    }
    const metadata = await sharp(source).metadata();
    await sharp(source).rotate().resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toFile(join(out, `${id}.webp`));
    await sharp(source).rotate().resize(640, 640, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(out, `${id}-thumb.webp`));
    collection.items.push({ id, source: name, src: `/art/${id}.webp`, thumb: `/art/${id}-thumb.webp`, width: metadata.width, height: metadata.height, alt: collection.id === 'zine' ? `Zine, page ${collection.items.length+1}` : `${collection.label}, work ${i+1}` });
    console.log(id, name);
  }
  delete collection.folder;
}
const manifest = new URL('../src/content.json', import.meta.url);
const existing = JSON.parse(await readFile(manifest, 'utf8'));
const local = new Map(collections.filter(c => ['personal','logos','zine'].includes(c.id)).map(c => [c.id,c]));
const merged = existing.map(c => local.has(c.id) ? {...c, items:[...c.items.filter(item => item.origin), ...local.get(c.id).items.map(item=>({...item,...(c.items.find(old=>old.id===item.id)?.url?{url:c.items.find(old=>old.id===item.id).url}:{})}))]} : c);
await writeFile(manifest, JSON.stringify(merged, null, 2) + '\n');
