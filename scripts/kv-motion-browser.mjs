import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.REVIEW_URL||'http://localhost:3012');await page.waitForFunction(()=>document.querySelector('.mobile-kv-space')?.kvStats?.().loaded===6);
 const stats=()=>page.locator('.mobile-kv-space').evaluate(e=>e.kvStats());
 const start=await stats();await page.screenshot({path:'/tmp/cole-mobile-before/journey-start.png'});
 await page.waitForFunction(()=>document.querySelector('.mobile-kv-space').kvStats().time>5,{},{timeout:90000});await page.screenshot({path:'/tmp/cole-mobile-before/journey-travel.png'});
 await page.waitForFunction(()=>document.querySelector('.mobile-kv-space').kvStats().exchanges>=3,{},{timeout:90000});await page.waitForFunction(()=>document.querySelector('.mobile-kv-space').kvStats().loaded===6);
 const end=await stats();await page.screenshot({path:'/tmp/cole-mobile-before/journey-next.png'});
 assert(end.camera[2]<start.camera[2]-60,'Camera should advance through real space');
 assert(end.items.some(id=>!start.items.includes(id)),'New work should enter');
 assert(end.seen.length>=6,'More than the initial group should be revealed');
 assert.equal(new Set(end.items).size,6,'No simultaneous duplicates');
 assert.equal(end.artworks,6,'Geometry count stays bounded');
 assert(end.gpu.textures<=8,'GPU texture count stays bounded');
 assert(end.poolSize>50,'Use the whole portfolio');
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: forward camera travel, new artwork arriving, multiple layers revealed, six planes maximum, full portfolio pool.',JSON.stringify({time:end.time,exchanges:end.exchanges,seen:end.seen.length,pool:end.poolSize}));
}finally{await browser.close();}
