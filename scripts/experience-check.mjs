import { chromium } from '@playwright/test';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/art/**',async route=>{await gate;await route.continue();});
 await page.goto(process.env.REVIEW_URL||'http://localhost:3010/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#app').inert);
 if(!await page.locator('#boot').isVisible())throw Error('Loader absent during asset loading');
 await page.screenshot({path:'/tmp/cole-check/loading.png'});
 release();
 await page.waitForFunction(()=>!document.querySelector('#boot'));
 await page.locator('[data-category="0"]').click();
 await page.waitForFunction(()=>window.portfolio.stats().transitioning);
 await page.waitForTimeout(350);
 await page.screenshot({path:'/tmp/cole-check/transition.png'});
 await page.locator('[data-category="2"]').click();
 await page.locator('[data-category="1"]').click();
 await page.waitForFunction(()=>!window.portfolio.stats().transitioning);
 const stats=await page.evaluate(()=>window.portfolio.stats());
 if(stats.active!==1||stats.artworks!==4)throw Error('Rapid selection failed');
 if(stats.drawCalls>30)throw Error('Unexpected draw-call growth');
 await page.locator('#home').click();
 await page.waitForFunction(()=>!window.portfolio.stats().transitioning);
 console.log('PASS: loading blocks until assets ready, loader exits, camera transition runs, rapid category changes settle correctly, draw-call budget.',stats.drawCalls);
}finally{await browser.close();}
