import { chromium } from '@playwright/test';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(60000);
  await page.goto(process.env.REVIEW_URL||'http://localhost:3010/');
  await page.waitForFunction(()=>!document.querySelector('#boot'));
  const centered=()=>page.evaluate(()=>{const r=document.querySelector('#exhibition-frame').getBoundingClientRect();return Math.abs((r.left+r.right)/2-innerWidth/2)<1;});
  if(!await centered())throw Error('Library is not screen-centered');
  const origin=await page.evaluate(()=>window.portfolio.stats().target);
  await page.locator('[data-category="0"]').click();
  await page.waitForFunction(()=>window.portfolio.stats().transitioning);
  await page.waitForFunction(()=>!window.portfolio.stats().transitioning);
  const room=await page.evaluate(()=>window.portfolio.stats().target);
  if(Math.hypot(...room.map((n,i)=>n-origin[i]))<100)throw Error('Collection must inhabit a separate room');
  await page.locator('[data-category="2"]').click();
  await page.locator('[data-category="1"]').click();
  await page.waitForFunction(()=>!window.portfolio.stats().transitioning);
  const settled=await page.evaluate(()=>window.portfolio.stats());
  if(settled.active!==1||settled.artworks!==4||Math.abs(settled.target[0]-90)>.01)throw Error('Interrupted flight lost its destination');
  if(settled.drawCalls>30)throw Error('Environment exceeded draw-call budget');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  if(!await centered())throw Error('Mobile library is not screen-centered');
  console.log('PASS: centered desktop/mobile library, separate room destinations, interrupted flights, draw-call budget.');
} finally { await browser.close(); }
