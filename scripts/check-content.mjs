import { readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const collections=JSON.parse(await readFile(new URL('../src/content.json',import.meta.url)));
assert.equal(collections.length,5);
const ids=new Set();
for(const c of collections){
  assert(c.id&&c.label&&Array.isArray(c.items));
  for(const item of c.items){
    assert(!ids.has(item.id),`Duplicate id: ${item.id}`);ids.add(item.id);
    assert(item.width>0&&item.height>0&&item.alt);
    for(const key of ['src','thumb']){
      assert(item[key].startsWith('/art/'));
      const file=new URL(`../public${item[key]}`,import.meta.url);
      await access(file);
      const metadata=await sharp(file.pathname).metadata();
      assert(Math.abs(metadata.width/metadata.height-item.width/item.height)<.01,`Aspect ratio changed: ${item.id}`);
    }
  }
}
const zine=collections.find(c=>c.id==='zine');
for(let i=1;i<zine.items.length;i++)assert(zine.items[i-1].source.localeCompare(zine.items[i].source,'en',{numeric:true})<0,'Zine out of sequence');
console.log(`PASS: ${ids.size} works, five collections, assets readable, aspect ratios preserved, zine in sequence.`);
