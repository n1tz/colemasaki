import {chromium} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await page.goto('http://localhost:3012');await page.waitForFunction(()=>document.querySelector('.loading').hidden);await page.evaluate(()=>document.fonts.ready);
 const result=[];
 for(const index of [-1,0]){
  if(index===0)await page.locator('[data-category="0"]').click();
  await page.evaluate(()=>new Promise(resolve=>{let n=0;function tick(){if(++n===8)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
  result.push(await page.evaluate(()=>({ui:[...document.querySelectorAll('.brand,.topline,.collection-nav,.stage-caption,.bottom-bar,#exhibition-frame,.collection-pager,.collection-sides')].map(e=>({class:e.className,rect:e.getBoundingClientRect().toJSON(),styles:[...getComputedStyle(e)].map(k=>[k,getComputedStyle(e).getPropertyValue(k)])})),scene:window.portfolio.stats().motion.art})));
  await page.screenshot({path:`/tmp/cole-mobile-before/desktop-${process.argv[2]}-${index}.png`});
 }
 if(process.argv[2]==='before')await writeFile('/tmp/cole-mobile-before/desktop.json',JSON.stringify(result));
 else {const expected=JSON.parse(await readFile('/tmp/cole-mobile-before/desktop.json','utf8')); for(const snapshots of [result,expected])for(const snapshot of snapshots)for(const item of snapshot.ui)item.styles.sort(([a],[b])=>a.localeCompare(b)); assert.deepEqual(result,expected);}
 console.log('PASS: desktop '+process.argv[2]);
}finally{await browser.close();}
