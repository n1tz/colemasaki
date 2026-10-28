import { readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const collections=JSON.parse(await readFile(new URL('../src/content.json',import.meta.url)));
assert.equal(collections.length,8);
assert.deepEqual(collections.slice(0,3).map(c=>c.id),['professional','websites','personal']);
assert.equal(collections.find(c=>c.id==='websites').items.length,4);
for(const item of collections[0].items.filter(item=>item.origin==='akiba-eden-lot'))assert(/Tシャツ|Ｔシャツ|パーカー|hoodie/i.test(item.title),'Professional work must be shirts or hoodies');
const personal=collections.find(c=>c.id==='personal');
assert.deepEqual(personal.items.slice(0,9).map(i=>i.source),['ds3.jpg','Fun1.jpg','JiraiyaPrintform.jpg','kuniyoshi1.jpg','KomuroNose1Test.png','inflatedstein1CCB.png','SteinBrain1.3.png','Otani_Furuinosuke.jpg','comp.jpg']);
assert.equal(collections[0].items[0].id,'professional-shirt-back');
assert.equal(collections[0].items[2].source,'komuroproj3B3.png');
assert.equal(collections[0].items.length,12);
assert(!collections[0].items.some(i=>['professional-01','professional-03','professional-10','professional-11','professional-12','professional-15'].includes(i.id)),'Removed professional work reintroduced');
for(let i=10;i<personal.items.length;i++)assert(Math.min(personal.items[i-1].width,personal.items[i-1].height)>=Math.min(personal.items[i].width,personal.items[i].height),'Personal resolution order');
const removed=new Set(['personal-10','personal-05','instagram-CWoHLlLJ5Lr','instagram-CVdT2YgJrTW','instagram-CXlr3jtuo6q','instagram-CXKZlkSJ7uH','instagram-C4hnuuIJCo0']);
assert(!collections.some(c=>c.items.some(i=>removed.has(i.id))),'Reviewed duplicate reintroduced');
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
const fonts=collections.find(c=>c.id==='fonts');
assert.deepEqual(fonts.items.map(i=>i.fontFamily),['Gutz','Yomenee']);
for(const font of fonts.items)await access(new URL(`../public${font.download}`,import.meta.url));
for(let i=1;i<zine.items.length;i++)assert(zine.items[i-1].source.localeCompare(zine.items[i].source,'en',{numeric:true})<0,'Zine out of sequence');
console.log(`PASS: ${ids.size} works, ${collections.length} collections, assets readable, aspect ratios preserved, zine in sequence.`);
