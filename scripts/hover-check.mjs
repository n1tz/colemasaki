import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3010');await page.waitForFunction(()=>!document.querySelector('#boot'));
 await page.locator('[data-category="0"]').click();await page.waitForFunction(()=>!window.portfolio.stats().transitioning);await page.waitForTimeout(1000);
 const stats=()=>page.evaluate(()=>window.portfolio.stats());
 const width=a=>a.rect.right-a.rect.left;
 const base=await stats();
 for(let i=0;i<3;i++){
  const before=await stats(),r=before.motion.art[i].rect;
  await page.mouse.move((r.left+r.right)/2,(r.top+r.bottom)/2);await page.waitForTimeout(1000);
  const s=await stats();assert(width(s.motion.art[i])>width(base.motion.art[i])*1.35,'Hovered work did not enlarge');
  for(let j=0;j<3;j++)if(j!==i)assert(width(s.motion.art[j])<width(base.motion.art[j])*.85,'Neighbor did not shrink');
  for(const a of s.motion.art){const r=a.rect,v=s.viewport;assert(r.left>=v.left-2&&r.right<=v.right+2&&r.top>=v.top-2&&r.bottom<=v.bottom+2,'Clipping');}
  for(let j=1;j<3;j++)assert(s.motion.art[j].rect.left>s.motion.art[j-1].rect.right,'Overlapping images');
  if(i===1)await page.screenshot({path:'/tmp/cole-check/hover-focus.png'});
 }
 await page.mouse.move(10,10);await page.waitForTimeout(1000);
 const reset=await stats();assert(Math.abs(width(reset.motion.art[0])-width(base.motion.art[0]))<3,'Did not restore');
 const r=reset.motion.art[1].rect;await page.mouse.click((r.left+r.right)/2,(r.top+r.bottom)/2);assert(await page.locator('.viewer').evaluate(e=>e.open),'Click failed');
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: hover enlargement, neighboring shrink/reflow, bounds, separation, reset and click.');
}finally{await browser.close();}
