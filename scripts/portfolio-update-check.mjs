import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const collections=JSON.parse(await readFile('src/content.json','utf8'));
const url=process.env.REVIEW_URL||'http://localhost:3010';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
await mkdir('/tmp/cole-update-check',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.goto(url);await page.waitForFunction(()=>window.portfolio&&document.querySelector('.loading').hidden);
 for(let i=0;i<collections.length;i++){
  await page.locator(`[data-category="${i}"]`).click();
  await page.waitForFunction(i=>window.portfolio.activeCollection===i,i);
  await page.waitForTimeout(100);
  const stats=await page.evaluate(()=>window.portfolio.stats());
  assert(stats,`No scene for ${collections[i].id}`);
 }
 await page.locator('[data-category="4"]').click();
 await page.screenshot({path:'/tmp/cole-update-check/desktop-fonts.png'});
 await page.locator('#view-collection').click();
 await page.evaluate(()=>document.fonts.ready);
 for(const [index,family] of ['Gutz','Yomenee'].entries()){
  assert.equal(await page.locator('.font-glyphs span').count(),62);
  assert.equal(await page.locator('textarea').evaluate(el=>getComputedStyle(el).fontFamily),`${family}, sans-serif`);
  await page.locator('textarea').fill('Abc 123');await page.locator('textarea').press('ArrowLeft');
  assert.equal(await page.locator('textarea').inputValue(),'Abc 123');
  assert.equal(await page.locator('#original').getAttribute('href'),`/fonts/${family}.ttf`);
  await page.locator('.font-tools input').fill('84');
  assert.equal(await page.locator('textarea').evaluate(el=>getComputedStyle(el).fontSize),'84px');
  await page.locator('.font-reset').click();assert.equal(await page.locator('textarea').inputValue(),'Aa');
  const download=page.waitForEvent('download');await page.locator('#original').click();
  const downloaded=await download;assert.equal(downloaded.suggestedFilename(),`${family}.ttf`);
  const actual=await readFile(await downloaded.path()),expected=await readFile(`public/fonts/${family}.ttf`);
  assert.equal(createHash('sha256').update(actual).digest('hex'),createHash('sha256').update(expected).digest('hex'));
  await page.screenshot({path:`/tmp/cole-update-check/desktop-${family}.png`});
  if(index===0)await page.locator('#next').click();
 }
 await page.keyboard.press('Escape');
 await page.locator('[data-category="0"]').click();await page.locator('#open-index').click();
 const pro=page.locator('.index-section').nth(0).locator('.index-item');
 assert.match(await pro.nth(2).locator('img').getAttribute('src'),/professional-komuro/);
 const personal=page.locator('.index-section').nth(2).locator('.index-item');
 for(const [i,id] of ['personal-rhinoplasty','personal-stein-inflated','personal-stein-brain'].entries())assert.match(await personal.nth(i+4).locator('img').getAttribute('src'),new RegExp(id));
 assert.equal(await page.locator('img[src*="instagram-C4hnuuIJCo0"]').count(),0);
 await pro.nth(2).click();await page.locator('.view-body img').evaluate(img=>img.decode());
 await page.screenshot({path:'/tmp/cole-update-check/desktop-komuro.png'});await page.keyboard.press('Escape');
 for(const width of [390,320,800]){
  await page.setViewportSize({width,height:844});
  await page.goto(url+'/#fonts');await page.waitForSelector('.mobile-fonts');await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.mobile-fonts .font-specimen').count(),2);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow ${width}`);
  const input=page.locator('.mobile-fonts textarea').first();await input.fill('A1');await input.press('2');
  assert.equal(new URL(page.url()).hash,'#fonts');assert.equal(await input.inputValue(),'A12');
  await page.locator('.mobile-fonts .font-reset').first().click();
  await page.screenshot({path:`/tmp/cole-update-check/mobile-fonts-${width}.png`,fullPage:true});
 }
 await page.goto(url+'/#personal');await page.waitForSelector('.mobile-art');
 assert.equal(await page.locator('.mobile-art').count(),19);
 await page.locator('.mobile-art').nth(4).click();await page.locator('.view-body img').evaluate(img=>img.decode());
 assert.match(await page.locator('.view-body img').getAttribute('src'),/personal-rhinoplasty/);
 await page.keyboard.press('Escape');
 await page.goto(url+'/#zine');await page.locator('.mobile-art').first().click();await page.locator('.view-body img').evaluate(img=>img.decode());
 assert.equal(await page.locator('.viewer').evaluate(el=>el.classList.contains('font-viewer')),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: all eight desktop collections, requested image ordering, duplicate removal, live font rendering/editing/sizing/reset, exact TTF downloads, mobile widths 320/390/800, artwork and zine viewers; no browser errors.');
}finally{await browser.close()}
