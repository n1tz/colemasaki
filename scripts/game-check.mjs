import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { isVideo, storeLink } from '../src/game.js';

const collections=JSON.parse(await readFile(new URL('../src/content.json',import.meta.url)));
const game=collections[0];
assert.equal(game.id,'game');
assert.equal(game.items.length,6);
assert(isVideo(game.items[0]));
assert.equal(game.storeUrl,'');
assert(!storeLink(game).includes('<a'));
assert(storeLink({...game,storeUrl:'https://store.steampowered.com/app/123/'}).includes('Visit store'));
assert.deepEqual(game.items.slice(1).map(item=>item.source),[5,4,3,2,1].map(i=>`Screenshot${i}.jpg`));
// Editor saves must retain the hosted trailer even when other content is edited.
const publish=await readFile(new URL('../api/publish.js',import.meta.url),'utf8');
const merge=vm.runInNewContext(publish.replace(/^import .*;\n/,'').split('export default')[0]+'\nmerge;');
const edited=structuredClone(collections);edited[0].label='Wheels of Steel';edited[0].storeUrl='https://store.steampowered.com/app/123/';
const saved=merge(collections,edited,new Set());
assert.equal(saved[0].items[0].videoSrc,game.items[0].videoSrc);
assert.equal(saved[0].items[0].src,game.items[0].src);
assert.equal(saved[0].storeUrl,edited[0].storeUrl);
assert.equal(saved[0].hero,game.hero);
assert.equal(saved[0].logo,game.logo);
for(const path of [game.hero,game.logo])assert((await readFile(new URL(`../public${path}`,import.meta.url))).length>0);

const mp4=await readFile(new URL(`../public${game.items[0].videoSrc}`,import.meta.url));
const atoms=[];
for(let pos=0;pos+8<=mp4.length;){
  let size=mp4.readUInt32BE(pos);const type=mp4.toString('ascii',pos+4,pos+8);
  if(size===1)size=Number(mp4.readBigUInt64BE(pos+8));
  if(size===0)size=mp4.length-pos;
  assert(size>=8&&pos+size<=mp4.length,'Invalid MP4 atom');atoms.push(type);pos+=size;
}
assert(atoms.includes('mdat')&&atoms.includes('moov'));
assert(atoms.indexOf('moov')<atoms.indexOf('mdat'),'Metadata must precede video for fast start');
console.log('PASS: first collection, six game media items, Steam states, hero and logo assets, editor preservation, fast-start MP4.');
