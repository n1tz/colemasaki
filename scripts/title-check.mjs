import { chromium } from '@playwright/test';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.REVIEW_URL||'http://localhost:3010/');
 await page.waitForFunction(()=>!document.querySelector('#boot'));
 const title=page.locator('.brand h1');
 async function settled(expected){
  await page.waitForFunction(()=>document.querySelector('.brand h1').dataset.resolving==='false');
  const actual=await title.locator('i').allTextContents();
  if(actual.join('')!==expected||await title.getAttribute('aria-label')!==expected)throw Error('Incorrect title: '+actual.join(''));
  const fit=await title.evaluate(el=>{const r=el.firstElementChild.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;});
  if(!fit)throw Error('Title overflows mobile');
 }
 await settled('COLE MASAKI');
 await page.locator('[data-category="0"]').click();
 if(await title.getAttribute('data-resolving')!=='true')throw Error('No section scramble');
 await settled('2D PERSONAL WORK');
 await page.locator('[data-category="1"]').click();
 await page.locator('[data-category="2"]').click();
 await settled('ZINE');
 await page.locator('[data-category="4"]').click();await settled('DRAWINGS & PAINTINGS');
 await page.screenshot({path:'/tmp/cole-check/title-mobile.png'});
 await page.locator('#home').click();await settled('COLE MASAKI');
 await page.close();
 const reduced=await browser.newPage({reducedMotion:'reduce',viewport:{width:1280,height:800}});
 await reduced.goto((process.env.REVIEW_URL||'http://localhost:3010/')+'#zine');
 await reduced.waitForFunction(()=>!document.querySelector('#boot'));
 const result=await reduced.locator('.brand h1').evaluate(el=>({name:el.getAttribute('aria-label'),resolving:el.dataset.resolving}));
 if(result.name!=='ZINE'||result.resolving!=='false')throw Error('Deep link or reduced motion failed');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: load title, sequential scramble, category titles, rapid navigation, mobile fit, overview restore, direct link, reduced motion.');
}finally{await browser.close();}
