import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
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
  { id: 'personal', label: '2D Personal Work', folder: '2DPersonal', items: [] },
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
    collection.items.push({ id, source: name, src: `/art/${id}.webp`, thumb: `/art/${id}-thumb.webp`, width: metadata.width, height: metadata.height, alt: collection.id === 'zine' ? `Zine, page ${i+1}` : `${collection.label}, work ${i+1}` });
    console.log(id, name);
  }
  delete collection.folder;
}
await writeFile(new URL('../src/content.json', import.meta.url), JSON.stringify(collections, null, 2) + '\n');
