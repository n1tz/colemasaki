import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const collections=JSON.parse(await readFile(new URL('../src/content.json',import.meta.url)));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.REVIEW_URL||'http://localhost:3012');await page.waitForFunction(()=>!document.querySelector('#boot'));
 assert.equal(await page.locator('#space canvas').count(),0,'Mobile should not initialize the full desktop scene');
 await page.locator('.mobile-room img').evaluateAll(images=>Promise.all(images.map(i=>{i.loading='eager';return i.decode();})));
 await page.screenshot({path:'/tmp/cole-mobile-before/mobile-home.png',fullPage:true});
 for(const size of [{width:390,height:844},{width:320,height:568},{width:768,height:1024}]){
  await page.setViewportSize(size);
  for(let ci=0;ci<collections.length;ci++){
   await page.locator('.mobile-menu-button').click();
   await page.locator(`#mobile-menu [data-room="${ci}"]`).click();
   assert.equal(await page.locator('.mobile-art').count(),collections[ci].items.length);
   assert(await page.locator('.mobile-section h1').innerText()===collections[ci].label);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
   if(!collections[ci].items.length)continue;
   if(ci===0&&size.width===390){await page.locator('.mobile-art img').evaluateAll(images=>Promise.all(images.map(i=>{i.loading='eager';return i.decode();})));await page.screenshot({path:'/tmp/cole-mobile-before/mobile-professional.png',fullPage:true});}
   const art=page.locator('.mobile-art').last();await art.scrollIntoViewIfNeeded();await art.click();
   await page.locator('.view-body img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
   assert(await page.locator('.page-label').innerText()===`${String(collections[ci].items.length).padStart(2,'0')} / ${String(collections[ci].items.length).padStart(2,'0')}`);
   if(size.width===390&&ci===0)await page.screenshot({path:'/tmp/cole-mobile-before/mobile-viewer.png'});
   await page.locator('[data-close="viewer"]').click();assert(await art.evaluate(e=>e===document.activeElement),'Viewer should restore artwork focus');
  }
 }
 await page.setViewportSize({width:390,height:844});await page.locator('.mobile-menu-button').click();await page.locator('#mobile-menu [data-room="4"]').click();
 await page.locator('[data-density="large"]').click();assert.equal(await page.locator('.mobile-art-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),1);
 await page.locator('[data-density="grid"]').click();assert.equal(await page.locator('.mobile-art-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),2);
 await page.locator('.mobile-art').first().click();await page.locator('#next').click();assert.equal(await page.locator('.page-label').innerText(),'02 / 18');await page.keyboard.press('Escape');
 await page.locator('.mobile-art').first().click();
 await page.locator('.view-body').dispatchEvent('touchstart',{touches:[{identifier:1,clientX:300,clientY:300}]});
 await page.locator('.view-body').dispatchEvent('touchend',{changedTouches:[{identifier:1,clientX:100,clientY:300}]});
 assert.equal(await page.locator('.page-label').innerText(),'02 / 18');await page.keyboard.press('Escape');
 await page.locator('.mobile-menu-button').click();await page.keyboard.press('Escape');assert(await page.locator('.mobile-menu-button').evaluate(e=>e===document.activeElement));
 await page.locator('.mobile-back').click();await page.goBack();await page.waitForFunction(()=>window.portfolio.activeCollection===4);
 // Switch to desktop and back without losing the selected collection.
 await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>window.portfolio.stats()?.active===4);assert.equal(await page.locator('.mobile-gallery').isVisible(),false);
 await page.setViewportSize({width:390,height:844});assert(await page.locator('.mobile-gallery').isVisible());
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: mobile collections, all artwork accessible, grid/large layouts, full-screen viewer, focus restoration, 320–768px bounds, no full desktop scene on mobile, desktop breakpoint switching.');
}finally{await browser.close();}
