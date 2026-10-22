import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3010');await page.waitForFunction(()=>document.querySelector('#boot')===null);
 await page.locator('[data-category="0"]').click();
 await page.waitForFunction(()=>window.portfolio.stats().transitioning);
 const start=Date.now();await page.waitForFunction(()=>!window.portfolio.stats().transitioning);assert(Date.now()-start<4500,'Transition too long');
 await page.waitForTimeout(800);
 async function check(){const s=await page.evaluate(()=>window.portfolio.stats());for(const a of s.motion.art){const r=a.rect,v=s.viewport;assert(r.left>=v.left-2&&r.right<=v.right+2&&r.top>=v.top-2&&r.bottom<=v.bottom+2,'Art clipped '+JSON.stringify({r,v}));}return s;}
 let s=await check();assert(s.artworks===3);assert(s.motion.art[0].rect.right-s.motion.art[0].rect.left>240,'Work too small');
 await page.screenshot({path:'/tmp/cole-check/art-focus-desktop.png'});
 await page.mouse.move(700,520);await page.mouse.down();await page.mouse.move(890,590,{steps:20});await page.mouse.up();await page.waitForTimeout(1000);await check();
 await page.locator('#zoom-out').click();await page.waitForTimeout(800);await check();
 await page.locator('#collection-next').click();await page.waitForFunction(()=>!window.portfolio.stats().transitioning);await page.waitForTimeout(800);s=await check();assert(s.motion.art[0].item===3);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1000);s=await check();assert(s.artworks===1);await page.screenshot({path:'/tmp/cole-check/art-focus-mobile.png'});
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: larger works, orbit/zoom bounds, pagination, mobile, and faster transitions.');
}finally{await browser.close();}
