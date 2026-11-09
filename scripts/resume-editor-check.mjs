// Run with the Vite server available at REVIEW_URL (default localhost:3017).
// GitHub and editor API writes are mocked: this never modifies the live repository.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const content=JSON.parse(await readFile(new URL('../src/content.json',import.meta.url)));
const site=JSON.parse(await readFile(new URL('../src/site.json',import.meta.url)));
const pdf=await readFile(new URL('../public'+site.about.resume,import.meta.url));
process.env.SESSION_SECRET='resume-test-secret-'.repeat(3);
process.env.GITHUB_TOKEN='test-only';
delete process.env.DEPLOY_HOOK_URL;
const {sessionCookie,config}=await import('../api/_lib.js');
const {default:upload}=await import('../api/upload.js');
const {default:publish}=await import('../api/publish.js');
const sha='a'.repeat(40), baseSha='b'.repeat(40), siteSha='c'.repeat(40);
let tree, writes=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{
 const path=new URL(url).pathname;let data={};
 if(options.method==='POST'||options.method==='PATCH')writes++;
 if(path.endsWith('/git/ref/heads/main'))data={object:{sha:'head'}};
 else if(path.endsWith('/git/commits/head'))data={sha:'head',tree:{sha:'tree'}};
 else if(path.endsWith('/contents/src/content.json'))data={sha:baseSha,content:Buffer.from(JSON.stringify(content)).toString('base64')};
 else if(path.endsWith('/contents/src/site.json'))data={sha:siteSha,content:Buffer.from(JSON.stringify(site)).toString('base64')};
 else if(path.endsWith('/git/trees')){tree=JSON.parse(options.body).tree;data={sha:'tree-next'};}
 else data={sha};
 return {ok:true,status:200,json:async()=>data};
};
async function call(handler,body,auth=true){
 const req={method:'POST',headers:{host:'localhost:3017','x-admin-request':'1'},body};
 if(auth)req.headers.cookie=sessionCookie(req,config.admin).split(';')[0];
 const res={setHeader(){},end(text){this.body=JSON.parse(text);}};
 await handler(req,res);return res;
}
try{
 assert.equal((await call(upload,{data:pdf.toString('base64'),kind:'resume'},false)).statusCode,401);
 assert.equal((await call(upload,{data:pdf.toString('base64'),kind:'resume'})).statusCode,200);
 assert.equal((await call(upload,{data:Buffer.from('not pdf').toString('base64'),kind:'resume'})).statusCode,400);
 assert.equal((await call(upload,{data:Buffer.alloc(3_000_001).toString('base64'),kind:'resume'})).statusCode,400);
 assert.equal((await call(upload,{data:pdf.toString('base64')})).statusCode,400);
 assert.equal((await call(upload,{data:Buffer.from([255,216,255,217]).toString('base64')})).statusCode,200);
 const next=structuredClone(site);next.about.resume='/resume/updated.pdf';
 const body={baseSha,siteSha,content,site:next,files:[{path:'public/resume/updated.pdf',sha}]};
 assert.equal((await call(publish,body)).statusCode,200);
 assert(tree.some(f=>f.path==='public/resume/updated.pdf'&&f.sha===sha));
 assert(tree.some(f=>f.path==='public'+site.about.resume&&f.sha===null));
 assert.equal(JSON.parse(tree.find(f=>f.path==='src/site.json').content).about.resume,next.about.resume);
 assert.deepEqual(JSON.parse(tree.find(f=>f.path==='src/content.json').content),content);
 for(const invalid of [{...body,files:[]},{...body,files:[{path:'public/resume/../../index.html',sha}]},{...body,files:[...body.files,...body.files]}]){
  const before=writes;assert.equal((await call(publish,invalid)).statusCode,400);assert.equal(writes,before);
 }
 assert.equal((await call(publish,{...body,siteSha:'stale'})).statusCode,409);
 assert.equal((await call(publish,{...body,site,files:[]})).statusCode,200);
 assert(!tree.some(f=>f.path==='public'+site.about.resume));
 console.log('PASS: authenticated PDF upload, size/type validation, atomic replacement, content preservation, stale edits and invalid paths.');
}finally{globalThis.fetch=originalFetch;}
const browser=await chromium.launch({args:['--no-sandbox']});
try{
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:900}});let current=structuredClone(site), requests=[],failure=false,published;
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;let data={};let status=200;
   if(path==='/api/session')data={login:'n1tz'};
   if(path==='/api/content')data={content,sha:baseSha,site:current,siteSha};
   if(path==='/api/upload'){
    requests.push(route.request().postDataJSON());
    await new Promise(r=>setTimeout(r,100));
    data=failure?{error:'Upload failed. Try again.'}:{sha};status=failure?500:200;
   }
   if(path==='/api/publish'){published=route.request().postDataJSON();current=published.site;data={deploying:true,url:'https://example.com/commit'};}
   await route.fulfill({status,json:data});
  });
  await page.goto((process.env.REVIEW_URL||'http://localhost:3017')+'/admin/index.html');
  await page.locator('.about-settings summary').click();
  await page.screenshot({path:`/tmp/resume-editor-${width}.png`});
  const input=page.locator('[data-resume-file]');const link=page.locator('[data-about-field="resume"]');
  const original=await link.inputValue();
  await input.setInputFiles({name:'bad.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a pdf')});
  await page.getByText('Choose a valid PDF résumé.',{exact:true}).waitFor();assert.equal(requests.length,0);assert.equal(await link.inputValue(),original);
  await input.setInputFiles({name:'large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(3_000_001)});
  await page.getByText('The résumé PDF must be 3 MB or smaller.',{exact:true}).waitFor();assert.equal(requests.length,0);
  failure=true;await input.setInputFiles({name:'resume.pdf',mimeType:'application/pdf',buffer:pdf});
  await page.getByText('Upload failed. Try again.',{exact:true}).waitFor();assert.equal(await link.inputValue(),original);
  failure=false;await input.setInputFiles({name:'resume.pdf',mimeType:'application/pdf',buffer:pdf});
  await page.getByText('Preview uploaded résumé ↗',{exact:true}).waitFor();assert.equal(requests.at(-1).kind,'resume');assert.equal(requests.at(-1).data,pdf.toString('base64'));
  const first=await link.inputValue();assert.notEqual(first,original);
  await page.locator('#discard').click();await page.locator('#discard').click();
  await page.waitForFunction(value=>document.querySelector('[data-about-field="resume"]').value===value,original);
  // Actual file drop, including a second replacement before Publish.
  for(let i=0;i<2;i++){
   const transfer=await page.evaluateHandle(bytes=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(bytes)],'updated.pdf',{type:'application/pdf'}));return dt;},[...pdf]);
   await page.locator('[data-resume-drop]').dispatchEvent('drop',{dataTransfer:transfer});await transfer.dispose();
   await page.waitForFunction(()=>!document.querySelector('[data-resume-file]').disabled);
  }
  await page.locator('#publish').click();await page.getByText('View current résumé ↗',{exact:true}).waitFor();
  assert.equal(published.files.length,1);assert.equal(published.files[0].path,'public'+published.site.about.resume);assert.deepEqual(published.content,content);assert.equal(published.site.about.intro,site.about.intro);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log(`PASS: ${width}px editor chooser, drop, replacement, preview, failed uploads, discard and publish.`);await page.close();
 }
}finally{await browser.close();}
