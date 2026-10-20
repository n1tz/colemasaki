import { chromium } from '@playwright/test';
import { writeFile,mkdir } from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox']});
await mkdir('/tmp/cole-sources',{recursive:true});
try{
 for(const [id,url] of [['lot','https://lot.akiba-eden.com/'],['mirailoom','https://mirailoom.com/'],['akihabara-global','https://akihabara.global/'],['akihabara-premium','https://www.akihabara-premium.com/'],['dub-agent','https://dub-agent.com/'],['instagram','https://www.instagram.com/colemasaki/']]){
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(6000);
   const data=await page.evaluate(()=>({title:document.title,text:document.body.innerText,links:[...document.querySelectorAll('a[href]')].map(a=>({text:a.innerText,url:a.href})),images:[...document.images].map(i=>({src:i.currentSrc||i.src,alt:i.alt,width:i.naturalWidth,height:i.naturalHeight}))}));
   await writeFile('/tmp/cole-sources/'+id+'.json',JSON.stringify(data,null,2));
   await page.screenshot({path:'/tmp/cole-sources/'+id+'.png'});
   console.log(id,data.title,data.text.slice(0,200),data.images.length,'images');
  }catch(e){console.log(id,e.message.slice(0,250));}
  await page.close();
 }
}finally{await browser.close();}
