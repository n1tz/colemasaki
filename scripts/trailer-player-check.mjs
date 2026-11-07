import { chromium } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';

const server=await preview({preview:{host:'127.0.0.1',port:5175,strictPort:true}});
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  for(const [width,height,mobile] of [[1440,1000,false],[390,844,true],[320,740,true],[844,390,true]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
    await page.goto('http://127.0.0.1:5175/#game');
    await page.waitForFunction(()=>!document.querySelector('#app').inert);
    const player=page.locator('.game-inline-video-player'),video=player.locator('video');
    await player.waitFor();
    assert.equal(await video.evaluate(el=>el.controls),false);
    assert.equal(await video.getAttribute('preload'),'none');
    await player.getByRole('button',{name:'Play trailer',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.game-inline-video').currentTime>.1);
    await player.getByRole('button',{name:'Pause trailer',exact:true}).click();
    assert(await video.evaluate(el=>el.paused));
    const seek=player.getByRole('slider',{name:'Trailer position'});
    await seek.fill('10');
    assert(Math.abs(await video.evaluate(el=>el.currentTime)-10)<.2);
    await seek.press('ArrowRight');
    assert(await video.evaluate(el=>el.currentTime)>10);
    await player.getByRole('button',{name:'Mute trailer',exact:true}).click();
    assert(await video.evaluate(el=>el.muted));
    await player.getByRole('button',{name:'Unmute trailer',exact:true}).click();
    assert.equal(await video.evaluate(el=>el.muted),false);
    // Native buttons support keyboard playback without triggering room shortcuts.
    await player.getByRole('button',{name:'Play trailer',exact:true}).press('Space');
    await page.waitForFunction(()=>!document.querySelector('.game-inline-video').paused);
    await player.getByRole('button',{name:'Pause trailer',exact:true}).press('Space');
    if(!mobile){
      await player.getByRole('slider',{name:'Trailer volume'}).fill('0.4');
      assert.equal(await video.evaluate(el=>el.volume),.4);
      await player.getByRole('button',{name:'Enter fullscreen'}).click();
      await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('trailer-player'));
      await player.getByRole('button',{name:'Exit fullscreen'}).click();
      await page.waitForFunction(()=>!document.fullscreenElement);
    }
    await player.scrollIntoViewIfNeeded();
    const geometry=await player.evaluate(el=>{
      const box=el.getBoundingClientRect(),controls=el.querySelector('.trailer-controls').getBoundingClientRect();
      const frame=el.querySelector('video').getBoundingClientRect();
      return {overflow:el.scrollWidth>el.clientWidth,bottom:controls.bottom,frameBottom:frame.bottom,controlsTop:controls.top,boxBottom:box.bottom,
        buttons:[...el.querySelectorAll('button')].filter(el=>!el.hidden).every(button=>{const b=button.getBoundingClientRect();return b.left>=box.left&&b.right<=box.right&&b.height>=44;})};
    });
    assert.equal(geometry.overflow,false);
    assert(geometry.buttons&&geometry.controlsTop>=geometry.frameBottom-1&&geometry.bottom<=geometry.boxBottom+1,JSON.stringify(geometry));
    if(mobile)assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await player.screenshot({path:`/tmp/cole-trailer-${width}.png`});
    // Seeking to the end exposes Replay and starts from the beginning on click.
    await video.evaluate(el=>{el.currentTime=el.duration-.1;return el.play();});
    await player.getByRole('button',{name:'Replay trailer',exact:true}).waitFor();
    await player.getByRole('button',{name:'Replay trailer',exact:true}).click();
    await page.waitForFunction(()=>{const v=document.querySelector('.game-inline-video');return !v.paused&&v.currentTime<2;});
    if(mobile)await page.locator('.mobile-home').click();
    else await page.locator('#home').click();
    await page.waitForFunction(()=>!document.querySelector('.game-inline-video'));
    await page.close();
    console.log(`PASS trailer ${width}×${height}: playback, seeking, audio, keyboard, replay, layout and navigation`);
  }
  const page=await browser.newPage({reducedMotion:'reduce'});
  await page.route('**/media/*.mp4',route=>route.abort());
  await page.goto('http://127.0.0.1:5175/#game');
  await page.waitForFunction(()=>!document.querySelector('#app').inert);
  await page.getByRole('button',{name:'Play trailer',exact:true}).click();
  await page.waitForFunction(()=>{const s=document.querySelector('.trailer-status');return s&&!s.hidden&&/Unable/.test(s.textContent);});
  assert.match(await page.getByRole('link',{name:'Open video directly'}).getAttribute('href'),/\.mp4$/);
  console.log('PASS trailer network failure feedback');
}finally{
  await browser.close();
  await new Promise(resolve=>server.httpServer.close(resolve));
}
