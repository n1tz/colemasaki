import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createArtworkSequence,journeyAt} from '../src/kv-journey.js';
const collections=JSON.parse(await readFile(new URL('../src/content.json',import.meta.url)));
const items=collections.flatMap(c=>c.items.map(i=>({...i,collectionId:c.id})));
let seed=13;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const next=createArtworkSequence(items,random);let last;
for(let cycle=0;cycle<3;cycle++){
 const drawn=Array.from({length:items.length},next);
 assert.equal(new Set(drawn.map(i=>i.id)).size,items.length,'Every work must appear once per cycle');
 assert.notEqual(drawn[0].id,last);last=drawn.at(-1).id;
 assert.equal(new Set(drawn.slice(0,5).map(i=>i.collectionId)).size,5,'Opening should span collections');
}
for(let t=0;t<600;t+=.01){const a=journeyAt(t),b=journeyAt(t+.01);assert(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)<1.1,'Camera jump');}
assert.equal(journeyAt(0).z,journeyAt(.8).z,'Brief stationary artwork hold');
console.log('PASS: full portfolio sequence and continuous chamber flights.');
const {roomVisibility,SHOT_DURATION}=await import('../src/kv-journey.js');
for(let cycle=1;cycle<100;cycle++){
 const before=journeyAt(cycle*SHOT_DURATION-.0001),after=journeyAt(cycle*SHOT_DURATION+.0001);
 const oldRooms=[cycle-1,cycle,cycle+1],newRooms=[cycle,cycle+1,cycle+2];
 for(const index of new Set([...oldRooms,...newRooms])){
  const a=oldRooms.includes(index)?roomVisibility(index-before.position):0;
  const b=newRooms.includes(index)?roomVisibility(index-after.position):0;
  assert(Math.abs(a-b)<.00001,'Visible chamber must not pop at recycling boundary');
 }
}
console.log('PASS: room visibility is continuous across 99 recycling boundaries.');
