import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const collections=JSON.parse(await readFile(new URL('../src/content.json',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.REVIEW_URL||'http://localhost:3010/');await page.waitForFunction(()=>document.querySelector('.loading').hidden);
 for(const size of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(size);
  for(let ci=0;ci<collections.length;ci++){
   await page.locator(`[data-category="${ci}"]`).click();await page.evaluate(()=>new Promise(resolve=>{let frames=0;function tick(){if(++frames===8)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
   if(await page.locator('.brand h1').getAttribute('aria-label')!==collections[ci].label.toUpperCase())throw Error('Wrong section title');
   const stats=await page.evaluate(()=>window.portfolio.stats());
   for(const a of stats.motion.art){const r=a.rect,v=stats.viewport;if(r.left<v.left-1||r.right>v.right+1||r.top<v.top-1||r.bottom>v.bottom+1)throw Error('Clipped artwork '+ci+' '+JSON.stringify({r,v,size}));}
   if(!collections[ci].items.length)continue;
   await page.locator('#view-collection').click();await page.locator('.view-body img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
   if(await page.locator('#original').getAttribute('href')!==(collections[ci].items[0].url||collections[ci].items[0].src))throw Error('Source link mismatch');
   await page.keyboard.press('Escape');
  }
  await page.locator('#home').click();await page.screenshot({path:`/tmp/cole-check/final-${size.width}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: seven rooms, desktop/mobile artwork bounds, category headings, all collection viewers, and source links.');
}finally{await browser.close();}
