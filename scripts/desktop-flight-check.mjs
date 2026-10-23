import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto(process.env.REVIEW_URL||'http://localhost:3012');await page.waitForFunction(()=>window.portfolio?.stats()&&!document.querySelector('#app').inert);
 for(const category of [0,-1,2]){
  await page.locator(category<0?'#home':`[data-category="${category}"]`).click();
  await page.waitForTimeout(180);const a=await page.evaluate(()=>portfolio.stats());assert(a.transitioning,'Flight should survive layout resize');
  await page.waitForFunction(previous=>{const s=portfolio.stats();return s.transitioning&&Math.hypot(...previous.map((n,i)=>n-s.camera[i]))>.1;},a.camera);
  await page.waitForFunction(()=>!portfolio.stats().transitioning);assert.equal(await page.evaluate(()=>portfolio.stats().active),category);
 }
 console.log('PASS: desktop overview/category flights remain animated through paging layout changes.');
}finally{await browser.close();}
