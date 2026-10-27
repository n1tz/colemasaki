// Render real type into image textures for the existing spatial gallery.
// Interactive specimens always use the TTF itself.
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1400},deviceScaleFactor:1});
 for(const [family,name,number,inverse] of [['Gutz','GUTZ','01',false],['Yomenee','Yomenee','02',true]]){
  const font=await readFile(`public/fonts/${family}.ttf`);
  await page.setContent(`<style>
   @font-face{font-family:Specimen;src:url(data:font/ttf;base64,${font.toString('base64')})}
   *{box-sizing:border-box}body{margin:0;background:${inverse?'#20221c':'#e4dfda'};color:${inverse?'#e4dfda':'#11120f'};padding:70px;font:18px monospace;height:1400px;display:flex;flex-direction:column}
   header,footer{display:flex;justify-content:space-between;align-items:center;letter-spacing:2px}header{border-bottom:1px solid currentColor;padding-bottom:28px}footer{border-top:1px solid currentColor;padding-top:28px;margin-top:auto}
   main{flex:1;display:flex;flex-direction:column;justify-content:center}h1{font:400 ${family==='Gutz'?260:130}px/1.2 Specimen;margin:0 0 80px;text-align:center;letter-spacing:0}
   .alphabet{font:400 59px/1.75 Specimen;letter-spacing:5px;margin:0;overflow-wrap:anywhere}.numbers{font:400 68px/1.4 Specimen;letter-spacing:12px;margin:30px 0 0}
  </style><header><span>${number} / ${name.toUpperCase()}</span><span>TYPEFACE / REGULAR</span></header><main><h1>${name}</h1><p class="alphabet">ABCDEFGHIJKLM<br>NOPQRSTUVWXYZ<br>abcdefghijklm<br>nopqrstuvwxyz</p><p class="numbers">0123456789</p></main><footer><span>COLE MASAKI</span><span>TRY & DOWNLOAD ↗</span></footer>`);
  await page.evaluate(()=>document.fonts.ready);
  const buffer=await page.screenshot();
  for(const [suffix,size] of [['',1400],['-thumb',640]])await sharp(buffer).resize(size).webp({quality:94}).toFile(`public/art/font-${family.toLowerCase()}${suffix}.webp`);
 }
}finally{await browser.close();}
