import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir,readFile } from 'node:fs/promises';
const collections=JSON.parse(await readFile(new URL('../src/content.json',import.meta.url),'utf8')).filter(c=>!c.hidden);
const base=process.env.REVIEW_URL||'http://localhost:5173';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const cases=[{width:1440,height:1000},{width:1280,height:720},{width:1024,height:768},{width:390,height:844,mobile:true},{width:320,height:740,mobile:true},{width:844,height:390,mobile:true}];
try{
 await mkdir('/tmp/cole-game-review',{recursive:true});
 for(const size of cases){
  const page=await browser.newPage({viewport:{width:size.width,height:size.height},hasTouch:Boolean(size.mobile),isMobile:Boolean(size.mobile),reducedMotion:'reduce'});
  page.setDefaultTimeout(60000);
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(`${base}/#game`);await page.locator('.game-inline-video').waitFor();await page.waitForFunction(()=>!document.querySelector('#app').inert);
  assert.equal(await page.locator('.game-screenshots .collection-work').count(),5,'Screenshots must all be present');
  assert.equal(await page.locator('.game-media-thumbs button').count(),6);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'game');
  if(size.mobile){
    await page.locator('.mobile-menu-button').click();
    assert.equal(await page.locator('.mobile-about').getAttribute('href'),'https://colemasaki.com/#about');
    await page.locator('.mobile-menu-close').click();assert(await page.locator('.mobile-header').isVisible());
    assert.equal(await page.locator('.mobile-footer a').first().getAttribute('href'),'https://colemasaki.com/#about');
  }else assert.equal(await page.locator('.sidebar-about').getAttribute('href'),'https://colemasaki.com/#about');
  assert.equal(await page.locator('.game-inline-video').getAttribute('preload'),'none');
  assert(!requests.some(url=>url.includes('trailer-v3.mp4')),'Trailer downloaded before play');
  assert.equal(await page.locator('.game-media-stage button').count(),0,'Duplicate play overlay');
  await page.locator('.game-inline-video').click();await page.locator('.game-inline-video').evaluate(video=>video.play());
  await page.waitForFunction(()=>document.querySelector('.game-inline-video').currentTime>0);
  await page.locator('[data-showcase-slide="1"]').click();
  const firstShot=page.locator('.game-screenshots .collection-image').first();await firstShot.locator('img').evaluate(image=>image.decode());
  await firstShot.click();await page.locator('.viewer').waitFor();assert(await page.locator('.game-inline-video').evaluate(video=>video.paused));await page.keyboard.press('Escape');
  await page.locator('[data-showcase-slide="0"]').click();
  const geometry=await page.evaluate(()=>{const r=el=>el.getBoundingClientRect().toJSON();return {width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,panel:r(document.querySelector('.portfolio-showcase')),store:r(document.querySelector('.game-steam')),label:r(document.querySelector('.game-steam .store-label')),status:r(document.querySelector('.game-steam .store-status'))};});
  assert(geometry.scroll<=geometry.width+1,'Horizontal overflow');
  assert(Math.abs((geometry.label.top+geometry.label.bottom-geometry.status.top-geometry.status.bottom)/2)<2,'Steam label and status not centered');
  if(!size.mobile){
    assert(Math.abs(geometry.panel.bottom-geometry.height)<1,'Page stops above viewport bottom');
    const sidebar=await page.locator('.desktop-sidebar').evaluate(root=>{const r=el=>el.getBoundingClientRect().toJSON();return {box:r(root),brand:r(root.querySelector('.sidebar-brand')),nav:r(root.querySelector('.collection-nav')),about:r(root.querySelector('.sidebar-about')),controls:r(root.querySelector('.bottom-bar')),scroll:root.scrollHeight,client:root.clientHeight};});
    assert(sidebar.brand.bottom<=sidebar.nav.top&&sidebar.nav.bottom<=sidebar.about.top&&sidebar.about.bottom<=sidebar.controls.top,'Sidebar sections overlap');
    assert(sidebar.box.right+12<=geometry.panel.left,'Sidebar overlaps content');
    assert(await page.locator('.desktop-sidebar #motion').count());assert(await page.locator('.desktop-sidebar .bottom-right a').count());
  }
  await page.screenshot({path:`/tmp/cole-game-review/game-${size.width}.png`,fullPage:true});
  await page.locator('[data-showcase-enter="-1"]').click();
  const feature=page.locator(size.mobile?'.mobile-game-card':'.portfolio-showcase .game-feature');await feature.waitFor();
  if(size.mobile){const image=await feature.locator('img').boundingBox();assert(Math.abs(image.width/image.height-16/9)<.02,'Mobile poster aspect ratio');assert.equal(await feature.locator('.game-feature-logo').count(),0);}
  else{assert.equal(await feature.locator('.game-feature-cta').evaluate(el=>getComputedStyle(el).borderTopColor),'rgb(82, 112, 148)');assert(await page.locator('.brand').isHidden());assert((await feature.boundingBox()).width>size.width*.65);}
  await page.screenshot({path:`/tmp/cole-game-review/overview-${size.width}.png`,fullPage:true});
  for(let ci=1;ci<collections.length;ci++){
    const c=collections[ci];
    if(size.mobile){await page.locator('.mobile-menu-button').click();await page.locator(`#mobile-menu [data-room="${ci}"]`).click();}
    else await page.locator(`.desktop-sidebar [data-category="${ci}"]`).click();
    const heading=page.locator(size.mobile?'.mobile-section h1':'.collection-heading h1');
    await heading.waitFor();await page.evaluate(()=>document.fonts.ready);
    assert.match(await heading.evaluate(el=>getComputedStyle(el).fontFamily),/Portfolio Sans/);
    assert(await heading.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Heading overflows');
    if(c.id==='fonts'){
      const specimens=page.locator(size.mobile?'.mobile-fonts .font-specimen':'.collection-fonts .font-specimen');await specimens.first().waitFor();assert.equal(await specimens.count(),c.items.length);
      for(let i=0;i<c.items.length;i++)assert.equal(await specimens.nth(i).locator('textarea').inputValue(),c.items[i].fontFamily.toLowerCase());
      await specimens.first().locator('textarea').fill('Test 123');assert.equal(await specimens.first().locator('textarea').inputValue(),'Test 123');
      await specimens.first().locator('.font-reset').click();assert.equal(await specimens.first().locator('textarea').inputValue(),c.items[0].fontFamily.toLowerCase());
      assert.equal(await specimens.first().locator('a[download]').getAttribute('href'),c.items[0].download);
    }else{
      const works=page.locator(size.mobile?'.mobile-art-grid > .mobile-art':'.curated-gallery .collection-work');await works.first().waitFor();assert.equal(await works.count(),c.items.length,`Missing works in ${c.id}`);
      if(!size.mobile)assert.deepEqual(await works.evaluateAll(nodes=>nodes.map(node=>node.dataset.workId)),c.items.map(item=>item.id),'Collection order changed');
      if(!size.mobile){
        const row=page.locator('.collection-row').first();await row.waitFor();
        const bounds=await row.locator('.collection-image img').evaluateAll(images=>images.map(image=>image.getBoundingClientRect().toJSON()));
        assert(bounds.length>=2,'Opening artwork stranded on its own');
        assert(Math.abs(bounds[0].height-bounds[1].height)<3,'Mixed formats should share an image height');
        assert(bounds.every(box=>box.height<=size.height*.54+2));
        if(c.id==='websites')assert.equal(bounds.length,2);
      }
      const button=size.mobile?works.first():works.first().locator('.collection-image');await button.click();await page.locator('.viewer').waitFor();await page.keyboard.press('Escape');
    }
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()),'#ff8a3d');
    assert(await page.locator('.collection-pager').isHidden(),'Pagination still visible');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Collection overflow');
    if(size.mobile&&c.id!=='fonts'){await page.locator('[data-density=grid]').click();assert.equal(await page.locator('.mobile-art').count(),c.items.length);await page.locator('[data-density=large]').click();}
    await page.screenshot({path:`/tmp/cole-game-review/${c.id}-${size.width}.png`});
    assert.equal(await page.locator(size.mobile?'.mobile-gallery':'.portfolio-showcase').evaluate(root=>/[←↑→↓↖↗↘↙]/.test(root.textContent)),false,'Text arrows remain');
  }
  const duplicateIds=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);});assert.deepEqual(duplicateIds,[]);
  assert.deepEqual(errors,[]);await page.close();
 }
 const flight=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});flight.setDefaultTimeout(60000);
 await flight.goto(base);await flight.waitForFunction(()=>!document.querySelector('#boot'));await flight.locator('#scroll-cue').click();
 await flight.waitForFunction(()=>window.portfolio.stats().hero.progress>.6);
 const mid=await flight.evaluate(()=>({scene:window.portfolio.stats(),hidden:document.querySelector('.portfolio-showcase').hidden}));assert(mid.scene.hero.progress<1&&mid.hidden&&!mid.scene.paused);assert(await flight.locator('#markers').isHidden());
 await flight.locator('.portfolio-showcase .game-feature').waitFor();assert.equal(await flight.evaluate(()=>window.portfolio.stats().hero.progress),1);
 for(const ci of [0,1,5,-1]){
   await flight.locator(ci<0?'#home':`.desktop-sidebar [data-category="${ci}"]`).click();await flight.waitForFunction(()=>window.portfolio.stats().transitioning);
   assert(await flight.locator('.portfolio-showcase').isHidden());await flight.waitForFunction(()=>!window.portfolio.stats().transitioning);await flight.locator('.portfolio-showcase').waitFor();
   const stats=await flight.evaluate(()=>window.portfolio.stats());assert(!stats.paused);assert(stats.camera.every(Number.isFinite));
   await flight.waitForFunction(time=>window.portfolio.stats().architectureTime>time+.1,stats.architectureTime);
 }
 await flight.locator('#motion').click();const frozen=await flight.evaluate(()=>window.portfolio.stats().architectureTime);await flight.waitForTimeout(200);assert.equal(await flight.evaluate(()=>window.portfolio.stats().architectureTime),frozen);
 await flight.locator('#motion').click();await flight.screenshot({path:'/tmp/cole-game-review/overview-live-world.png'});await flight.close();
 console.log('PASS: all collections and original order, scroll galleries, font editing/downloads, native playback, thumbnail jumps, sidebar geometry, mobile poster, Steam alignment, SVG arrows, hero/room transitions, background controls.');
}finally{await browser.close();}
