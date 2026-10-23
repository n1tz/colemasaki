import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results={};
try{for(const mobile of [true,false]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile});
 await page.addInitScript(()=>{window.longTasks=[];new PerformanceObserver(l=>longTasks.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.REVIEW_URL||'http://localhost:3012');
 await page.waitForFunction(m=>m?document.querySelector('.mobile-kv-space')?.kvStats?.().loaded===6:window.portfolio?.stats()&&!document.querySelector('#app').inert,mobile);
 await page.waitForTimeout(5000);
 results[mobile?'mobile':'desktop']=await page.evaluate(m=>{
 const resources=performance.getEntriesByType('resource');return {resources:resources.length,jsBytes:resources.filter(r=>/\.js/.test(r.name)).reduce((n,r)=>n+r.decodedBodySize,0),imageBytes:resources.filter(r=>/\.webp/.test(r.name)).reduce((n,r)=>n+r.decodedBodySize,0),longTasks:longTasks.length,longTaskMs:Math.round(longTasks.reduce((a,b)=>a+b,0)),stats:m?document.querySelector('.mobile-kv-space').kvStats():portfolio.stats()};
 },mobile);results[mobile?'mobile':'desktop'].errors=errors;await page.close();
}await writeFile(`/tmp/cole-perf-${process.env.AUDIT_LABEL||'before'}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([k,{stats,...v}])=>[k,{...v,drawCalls:stats.drawCalls,triangles:stats.triangles,gpu:stats.gpu}])),null,2));}finally{await browser.close();}
