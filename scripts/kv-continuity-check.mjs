import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 // Late network arrivals must never appear at full opacity in a single frame.
 await page.route('**/*-thumb.webp',async route=>{await new Promise(resolve=>setTimeout(resolve,1200));await route.continue();});
 await page.goto(process.env.REVIEW_URL||'http://localhost:3012');
 await page.waitForFunction(()=>document.querySelector('.mobile-kv-space')?.kvStats);
 await page.evaluate(()=>{
  window.continuity={recycles:0,maxTextures:0,failures:[]};let previous;
  function sample(){const s=document.querySelector('.mobile-kv-space')?.kvStats?.();if(s){
   continuity.maxTextures=Math.max(continuity.maxTextures,s.gpu.textures);
   if(previous)s.rooms.forEach((r,i)=>{
    if(r.index!==previous.rooms[i].index){continuity.recycles++;if(r.visibility>.001||previous.rooms[i].visibility>.01)continuity.failures.push('Visible room recycled');}
    for(let j=i*2;j<i*2+2;j++)if(previous.opacities[j]===0&&s.opacities[j]>.2)continuity.failures.push('Artwork appeared without fade');
   });previous=s;
  }window.continuityFrame=requestAnimationFrame(sample);}sample();
 });
 await page.waitForFunction(()=>continuity.recycles>=6,null,{timeout:180000});
 const result=await page.evaluate(()=>{cancelAnimationFrame(continuityFrame);return continuity;});
 assert.equal(result.failures.length,0,result.failures.join('\n'));assert(result.maxTextures<=8);assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: six recycling boundaries with delayed image responses, no visible replacement, gradual artwork reveal, bounded GPU textures.',result);
}finally{await browser.close();}
