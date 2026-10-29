import { readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const collections=JSON.parse(await readFile(new URL('../src/content.json',import.meta.url)));
assert.equal(collections.length,8);
const ids=new Set();
for(const c of collections){
  assert(c.id&&c.label&&Array.isArray(c.items));
  for(const item of c.items){
    assert(!ids.has(item.id),`Duplicate id: ${item.id}`);ids.add(item.id);
    assert(item.width>0&&item.height>0&&item.alt);
    if(item.type==='video'){assert.equal(c.id,'game','Videos belong in the Video Game collection');assert.equal(c.items.indexOf(item),0,'The video must be the first slide');assert(/^[\w-]{11}$/.test(item.youtube),`Invalid YouTube id: ${item.id}`);}
    for(const key of ['src','thumb']){
      assert(item[key].startsWith('/art/'));
      const file=new URL(`../public${item[key]}`,import.meta.url);
      await access(file);
      const metadata=await sharp(file.pathname).metadata();
      assert(Math.abs(metadata.width/metadata.height-item.width/item.height)<.01,`Aspect ratio changed: ${item.id}`);
    }
  }
}
const fonts=collections.find(c=>c.id==='fonts');
assert.deepEqual(fonts.items.map(i=>i.fontFamily).sort(),['Gutz','Yomenee']);
for(const font of fonts.items)await access(new URL(`../public${font.download}`,import.meta.url));
const game=collections.find(c=>c.id==='game');
assert(!game.storeUrl||/^https:\/\//.test(game.storeUrl),'Store URL must start with https://');
console.log(`PASS: ${ids.size} works, ${collections.length} collections, assets readable, aspect ratios preserved.`);
