import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await page.goto('http://localhost:3010');await page.waitForFunction(()=>!document.querySelector('#boot'));
 for(const size of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(size);await page.waitForTimeout(700);
  await page.evaluate(()=>new Promise(resolve=>{let n=0;function tick(){if(++n===4)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
  const base=await page.evaluate(()=>window.portfolio.stats());
  for(const button of ['#zoom-out','#zoom-out','#zoom-in','#zoom-in']){
   await page.locator(button).click();await page.evaluate(()=>new Promise(resolve=>{let n=0;function tick(){if(++n===4)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
   const s=await page.evaluate(()=>window.portfolio.stats());
   s.motion.art.forEach((a,i)=>{
    const r=a.rect,b=base.motion.art[i].rect;
    assert(Math.abs((r.right-r.left)/(b.right-b.left)-1)<.02,'Image size changed with zoom '+JSON.stringify({size,button,r,b,camera:s.camera}));
    assert(Math.abs((r.left+r.right-b.left-b.right)/2)<3,'Composition drifted');
   });
  }
 }
 console.log('PASS: overview artwork size and spacing remain stable through zoom in/out on desktop and mobile.');
}finally{await browser.close();}
