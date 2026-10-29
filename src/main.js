import './style.css';
import { vectorizeArrows, motionIcon } from './icons.js';
import collections from './content.json';
import { createTitle } from './title.js';
import { createMobileGallery } from './mobile-gallery.js';
import { fontSpecimen } from './font-specimen.js';
import { isVideo, videoFrame, storeLink, youtubeWatchUrl } from './game.js';

const $=s=>document.querySelector(s);
const pad=n=>String(n).padStart(2,'0');
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isZine=index=>collections[index]?.id==='zine';
const isGame=index=>collections[index]?.id==='game';
const total=collections.reduce((n,c)=>n+c.items.length,0);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let active=-1, space, viewing=null, returnFocus=null, motionEnabled=!reducedMotion, mobileGallery;
const mobileViewport=matchMedia('(max-width:800px)');
$('#app').innerHTML=`
  <div id="exhibition-frame"><nav class="collection-sides" aria-label="Artwork pages" hidden>
    <button id="collection-side-previous" aria-label="Previous group of artworks" title="Previous artworks"><svg viewBox="0 0 40 24" aria-hidden="true"><path d="M36 12H4M14 2L4 12l10 10"/></svg><span>PREV</span></button>
    <button id="collection-side-next" aria-label="Next group of artworks" title="Next artworks"><svg viewBox="0 0 40 24" aria-hidden="true"><path d="M4 12h32M26 2l10 10-10 10"/></svg><span>NEXT</span></button>
  </nav></div><main id="space" aria-label="Interactive 3D artwork gallery"></main>
  <div class="border" aria-hidden="true"></div>
  <header class="topline"><a class="site-logo" href="/" aria-label="Cole Masaki — overview"><img src="/favicon.svg" alt="" width="32" height="32" /></a><div class="top-actions"><span class="desktop">ART / DESIGN / INDEPENDENT WORK</span><button id="help" aria-label="Navigation help">[ ? ]</button></div></header>
  <div class="brand"><h1 aria-label="COLE MASAKI">COLE MASAKI</h1><p><span class="smallcross">✳</span>PERSONAL WORK & SELECTED DESIGN</p></div>
  <nav class="collection-nav" aria-label="Collections"><div class="nav-heading"><span>COLLECTIONS</span><span>01—${pad(collections.length)}</span></div>
    ${collections.map((c,i)=>`<button class="category ${c.items.length?'':'pending'}" data-category="${i}" aria-pressed="false"><span class="number">${pad(i+1)}</span><span class="category-label" data-short="${c.shortLabel||c.label}">${c.label}${c.items.length?'':'<small>To be added</small>'}</span><span class="count">${c.items.length?pad(c.items.length):'—'}</span></button>`).join('')}
    <button class="index-button" id="open-index">WORK INDEX <span>↗</span></button>
  </nav>
  <div id="markers" aria-hidden="true">${collections.map((c,i)=>`<button class="marker" data-marker="${i}" tabindex="-1">${pad(i+1)} / ${c.label.toUpperCase()} <span class="marker-count">${pad(c.items.length)} ${c.id==='zine'?'PAGES':'WORKS'} ↗</span></button>`).join('')}</div>
  <section class="stage-caption" aria-live="polite"><div class="eyebrow" id="location">00 / OVERVIEW</div><h2 id="section-name">Portfolio library.</h2><p id="section-info">Select a room to enter.</p><button id="view-collection" hidden>VIEW WORKS <span>↗</span></button></section>
  <div class="collection-pager" hidden><button id="collection-previous" aria-label="Previous group of artworks">←</button><span id="collection-range"></span><button id="collection-next" aria-label="Next group of artworks">→</button><span class="pager-store" hidden></span></div>
  <footer class="bottom-bar"><div><div class="controls" aria-label="Camera controls"><button class="home" id="home" aria-label="Return to overview">↖ OVERVIEW</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom-in" aria-label="Zoom in">+</button><button id="motion" aria-label="Pause animation" title="Pause animation" aria-pressed="true">Ⅱ</button></div><div class="instructions"><span>DRAG</span> ROTATE &nbsp; <span>SCROLL</span> ZOOM<br><span>CLICK</span> <span id="click-action">ENTER COLLECTION</span> &nbsp; <button id="help-bottom">? CONTROLS</button></div></div><div class="bottom-right"><a href="https://www.instagram.com/colemasaki/" target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a><div class="copyright">© COLE MASAKI<br>${pad(total)} FILES / ${pad(collections.length)} COLLECTIONS</div></div></footer>
  <div class="axis" aria-hidden="true"><svg viewBox="0 0 84 58"><g stroke="#b5b7aa" stroke-width=".7"><path d="M42 36V7M42 36L15 49M42 36L69 49"/><circle cx="42" cy="36" r="3" fill="#11120f"/></g><text x="38" y="6">Y</text><text x="6" y="54">X</text><text x="74" y="54">Z</text></svg></div>
  <div class="loading" role="status">LOADING WORKS…</div><div class="hover-label" hidden></div>
  <dialog class="viewer" aria-label="Artwork viewer"><div class="dialog-head"><span class="title" id="viewer-title"></span><button class="close" data-close="viewer" aria-label="Close artwork">CLOSE ×</button></div><div class="view-body"></div><div class="viewer-store" hidden></div><div class="viewer-footer"><div class="pager"><button id="previous" aria-label="Previous work">←</button><span class="page-label" aria-live="polite" aria-atomic="true"></span><button id="next" aria-label="Next work">→</button></div><input id="page-range" type="range" min="1" aria-label="Go to zine page" hidden><div class="secondary"><button id="image-zoom" aria-pressed="false">ZOOM +</button><a id="original" target="_blank" rel="noopener">OPEN IMAGE ↗</a></div></div></dialog>
  <dialog class="index-dialog" aria-label="Work index"><div class="dialog-head"><span class="title">WORK INDEX / ${total} FILES</span><button class="close" data-close="index-dialog" aria-label="Close index">CLOSE ×</button></div><div class="index-content">${collections.map((c,ci)=>`<section class="index-section"><h3><span>${pad(ci+1)}</span>${c.label}</h3>${c.items.length?`<div class="index-grid">${c.items.map((item,i)=>`<button class="index-item" data-work="${ci},${i}"><img src="${item.thumb}" alt="${escapeHTML(item.alt)}" loading="lazy"><span>${escapeHTML(item.title||(c.id==='zine'?'PAGE ':'WORK ')+pad(i+1))}</span></button>`).join('')}</div>`:'<p>No work added yet.</p>'}</section>`).join('')}</div></dialog>
  <dialog class="help-dialog" aria-label="Navigation help"><div class="dialog-head"><span class="title">NAVIGATION</span><button class="close" data-close="help-dialog" aria-label="Close help">CLOSE ×</button></div><div class="help-content"><dl><dt>Rotate</dt><dd>Drag / one finger</dd><dt>Zoom</dt><dd>Scroll / pinch / + −</dd><dt>Enter collection</dt><dd>Click a collection preview</dd><dt>Open work</dt><dd>Click an artwork</dd><dt>Change collection</dt><dd>Menu / keys 1–${collections.length}</dd><dt>Overview</dt><dd>Key 0 / overview button</dd><dt>Previous / next work</dt><dd>Left / right arrow keys in the viewer</dd><dt>Close viewer</dt><dd>Escape</dd><dt>Pause animation</dt><dd>Ⅱ in the camera controls</dd></dl><p>Use the work index for direct access to every image. The zine reads in page order; select an image to enlarge it.</p></div></dialog>
`;

vectorizeArrows($('#app'));

const title=createTitle($('.brand h1'),reducedMotion);
let titleReady=false;
const titleText=()=>active<0?'COLE MASAKI':collections[active].label.toUpperCase();
title.set(titleText(),{animate:false});

function select(index,updateHash=true){
  const changed=index!==active;
  active=index;
  if(changed)title.set(titleText(),{animate:titleReady});
  $('#app').classList.toggle('focused',index>=0);
  document.querySelectorAll('.category').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index));});
  $('#location').textContent=index<0?'00 / OVERVIEW':`${pad(index+1)} / ROOM`;
  $('#section-name').textContent=index<0?'Portfolio library.':collections[index].label;
  $('#section-info').innerHTML=index<0?'Select a room to enter.':collections[index].id==='fonts'?'02 custom typefaces / Try the fonts and download.':collections[index].items.length?`${pad(collections[index].items.length)} ${isZine(index)?'pages':'works'} / Click an image to open.`:'No work added yet.';
  $('#view-collection').hidden=index<0||!collections[index].items.length;
  $('#view-collection').innerHTML=collections[index]?.id==='fonts'?'TRY FONTS <span>↗</span>':isZine(index)?'READ ZINE <span>↗</span>':isGame(index)&&isVideo(collections[index].items[0])?'WATCH TRAILER <span>↗</span>':'VIEW WORKS <span>↗</span>';
  $('.pager-store').hidden=!isGame(index);$('.pager-store').innerHTML=isGame(index)?storeLink(collections[index]):'';vectorizeArrows($('.pager-store'));
  vectorizeArrows($('#view-collection'));
  $('#click-action').textContent=index<0?'ENTER COLLECTION':'OPEN WORK';
  if(!mobileViewport.matches)space?.select(index);
  mobileGallery?.select(index);
  if(!reducedMotion){
    document.querySelectorAll('.stage-caption > *').forEach((el,i)=>{el.getAnimations().forEach(a=>a.cancel());el.animate([{opacity:0,transform:'translateY(24px)',clipPath:'inset(100% 0 0)'},{opacity:1,transform:'none',clipPath:'inset(0)'}],{duration:700,delay:i*65,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});});
  }
  if(updateHash)history[mobileViewport.matches&&changed?'pushState':'replaceState'](null,'',index<0?location.pathname:`#${collections[index].id}`);
}
function pauseForDialog(){space?.setPaused(mobileViewport.matches||Boolean(document.querySelector('dialog[open]')));}
function showDialog(selector){returnFocus=document.activeElement;$(selector).showModal();pauseForDialog();}
function closeDialog(dialog){dialog.close();pauseForDialog();returnFocus?.focus();}
function renderWork(){
  const {category,index}=viewing;const collection=collections[category];const item=collection.items[index];
  const isFont=collection.id==='fonts';
  $('.viewer').classList.toggle('font-viewer',isFont);
  const video=isVideo(item),game=collection.id==='game';
  $('.viewer').classList.toggle('game-viewer',game);
  $('.viewer-store').hidden=!game;$('.viewer-store').innerHTML=game?storeLink(collection):'';vectorizeArrows($('.viewer-store'));
  const items=[item];
  $('#viewer-title').textContent=`${pad(category+1)} / ${collection.label}${isZine(category)?' / John Voynich’s Guide to the Basics':item.title?' / '+item.title:''}`;
  $('.view-body').className='view-body';
  $('.view-body').replaceChildren(...items.map(item=>{if(isFont)return fontSpecimen(item);if(video)return videoFrame(item);const image=new Image();image.src=item.src;image.alt=item.alt;image.addEventListener('click',toggleZoom);image.addEventListener('error',()=>{const p=document.createElement('p');p.className='image-error';p.textContent='Image could not load. Close and try again.';image.replaceWith(p);});return image;}));
  $('.view-body').scrollTop=0;
  $('.view-body').scrollLeft=0;
  $('.page-label').textContent=`${pad(index+1)} / ${pad(collection.items.length)}`;
  $('#previous').disabled=index===0;$('#next').disabled=index+items.length>=collection.items.length;
  $('#original').href=isFont?item.download:video?youtubeWatchUrl(item):item.url||item.src;
  if(isFont){$('#original').setAttribute('download',`${item.fontFamily}.ttf`);$('#original').removeAttribute('target');}else{$('#original').removeAttribute('download');$('#original').target='_blank';}
  $('#original').textContent=isFont?'DOWNLOAD TTF ↓':video?'WATCH ON YOUTUBE ↗':item.url?(collection.id==='websites'?'VISIT WEBSITE ↗':item.url?.includes('instagram.com/')?'VIEW POST ↗':'VIEW PROJECT ↗'):'OPEN IMAGE ↗';
  vectorizeArrows($('#original'));
  $('#image-zoom').hidden=video;$('#image-zoom').textContent='ZOOM +';$('#image-zoom').setAttribute('aria-pressed','false');
  $('#page-range').hidden=!isZine(category);$('#page-range').max=collection.items.length;$('#page-range').value=index+1;
  // Only adjacent full-size assets are prefetched; the scene uses small textures.
  const next=collection.items[index+items.length];if(next&&!isVideo(next)){const preload=new Image();preload.src=next.src;}
}
function openWork(category,index){
  onHover(null);
  if($('.index-dialog').open)closeDialog($('.index-dialog'));
  viewing={category,index};
  renderWork();showDialog('.viewer');
}
function turnPage(direction){
  if(!viewing)return;
  const count=collections[viewing.category].items.length;
  const next=viewing.index+direction;
  viewing.index=Math.max(0,Math.min(count-1,next));renderWork();
}
function toggleZoom(){const zoomed=$('.view-body').classList.toggle('zoomed');$('#image-zoom').textContent=zoomed?'FIT −':'ZOOM +';$('#image-zoom').setAttribute('aria-pressed',String(zoomed));}
function onHover(data,x=0,y=0){const label=$('.hover-label');label.hidden=!data;if(!data)return;label.textContent=active<0?`${collections[data.category].label} / ENTER ↗`:`${pad(data.category+1)}.${pad(data.item+1)} / ${isVideo(collections[data.category].items[data.item])?'PLAY':'OPEN'} ↗`;vectorizeArrows(label);label.style.left=`${Math.min(x+18,innerWidth-160)}px`;label.style.top=`${y+18}px`;}
document.querySelectorAll('[data-category],[data-marker]').forEach(el=>el.addEventListener('click',()=>select(Number(el.dataset.category??el.dataset.marker))));
document.querySelectorAll('[data-work]').forEach(el=>el.addEventListener('click',()=>openWork(...el.dataset.work.split(',').map(Number))));
document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>closeDialog($(`.${el.dataset.close}`))));
document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('close',()=>{if(dialog===$('.viewer')){viewing=null;$('.view-body').replaceChildren();}pauseForDialog();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);}});});
$('#home').onclick=()=>select(-1);$('#zoom-in').onclick=()=>space?.zoom(.8);$('#zoom-out').onclick=()=>space?.zoom(1.25);
function updateMotionButton(){const label=motionEnabled?'Pause animation':'Resume animation';$('#motion').innerHTML=motionIcon(!motionEnabled);$('#motion').setAttribute('aria-pressed',String(motionEnabled));$('#motion').setAttribute('aria-label',label);$('#motion').title=label;}
$('#motion').disabled=reducedMotion;updateMotionButton();$('#motion').onclick=()=>{motionEnabled=!motionEnabled;space?.setMotion(motionEnabled);updateMotionButton();};
$('#open-index').onclick=()=>showDialog('.index-dialog');$('#help').onclick=$('#help-bottom').onclick=()=>showDialog('.help-dialog');
$('#view-collection').onclick=()=>openWork(active,0);$('#previous').onclick=()=>turnPage(-1);$('#next').onclick=()=>turnPage(1);$('#image-zoom').onclick=toggleZoom;
$('#page-range').oninput=e=>{viewing.index=Number(e.target.value)-1;renderWork();};
addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select,[contenteditable="true"]'))return;
  if(document.querySelector('dialog[open]')){if($('.viewer').open&&e.target.tagName!=='INPUT'){if(e.key==='ArrowLeft'){e.preventDefault();turnPage(-1);}if(e.key==='ArrowRight'){e.preventDefault();turnPage(1);}}return;}
  if(/^[0-9]$/.test(e.key)&&Number(e.key)<=collections.length)select(Number(e.key)-1);
  if(e.key==='+'||e.key==='=')space?.zoom(.8);if(e.key==='-')space?.zoom(1.25);
});
function finishLoading(){ if(!titleReady){titleReady=true;title.set(titleText(),{delay:650});} $('.loading').hidden=true;$('#app').inert=false;const boot=$('#boot');if(boot){boot.classList.add('ready');setTimeout(()=>boot.remove(),reducedMotion?0:750);} }
function fallback(message){finishLoading();$('#markers').hidden=true;const div=document.createElement('div');div.className='fallback';const text=document.createElement('p');text.textContent=message;const button=document.createElement('button');button.textContent='OPEN WORK INDEX ↗';vectorizeArrows(button);button.onclick=()=>showDialog('.index-dialog');div.append(text,button);$('#space').append(div);}
function onPage(layout){
  const hidden=!layout||layout.pages<2;
  $('.collection-pager').hidden=hidden&&!(layout&&isGame(active));$('.collection-sides').hidden=hidden;
  $('.collection-pager').classList.toggle('single-page',hidden);
  if(!layout)return;
  $('#collection-range').textContent=`${layout.end-layout.start===1?pad(layout.end):`${pad(layout.start+1)}–${pad(layout.end)}`} / ${pad(collections[active]?.items.length??0)}`;
  for(const id of ['collection-previous','collection-side-previous'])$('#'+id).disabled=layout.page===0;
  for(const id of ['collection-next','collection-side-next'])$('#'+id).disabled=layout.page===layout.pages-1;
}
for(const id of ['collection-previous','collection-side-previous'])$('#'+id).onclick=()=>space?.turnExhibition(-1);
for(const id of ['collection-next','collection-side-next'])$('#'+id).onclick=()=>space?.turnExhibition(1);
$('#app').inert=true;
let spaceLoading;
function initializeSpace(){
  if(space||spaceLoading)return spaceLoading;
  spaceLoading=import('./scene.js').then(({createSpace})=>{
    space=createSpace($('#space'),collections,{onOpen:openWork,onSelect:select,onHover,onPage,reducedMotion,onProgress:value=>{const boot=$('#boot');if(boot){boot.style.setProperty('--progress',value);$('#boot-percent').textContent=Math.round(value*100)+'%';}},onReady:message=>{if(message)fallback(message);else finishLoading();}});
    if(active>=0)space.select(active);
    space.setMotion(motionEnabled);pauseForDialog();
  }).catch(error=>{console.warn('3D unavailable:',error);fallback('The 3D view is unavailable on this device. All artwork is available in the work index.');});
  return spaceLoading;
}

mobileGallery=createMobileGallery(collections,{onSelect:select,onOpen:openWork});
if(mobileViewport.matches)finishLoading();else initializeSpace();
mobileViewport.addEventListener('change',()=>{
  if(mobileViewport.matches){space?.setPaused(true);finishLoading();}
  else{initializeSpace();space?.select(active);pauseForDialog();}
});
// Touch navigation complements the visible previous/next controls.
let viewerTouch=null;
$('.view-body').addEventListener('touchstart',e=>{viewerTouch=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
$('.view-body').addEventListener('touchend',e=>{
  if(!mobileViewport.matches||!viewerTouch||$('.view-body').classList.contains('zoomed')||$('.viewer').classList.contains('font-viewer'))return;
  const touch=e.changedTouches[0],dx=touch.clientX-viewerTouch.x,dy=touch.clientY-viewerTouch.y;viewerTouch=null;
  if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)turnPage(dx<0?1:-1);
},{passive:true});
$('.view-body').addEventListener('touchcancel',()=>{viewerTouch=null;},{passive:true});

const route=collections.findIndex(c=>c.id===location.hash.slice(1));if(route>=0)select(route,false);
addEventListener('hashchange',()=>select(collections.findIndex(c=>c.id===location.hash.slice(1)),false));
// Read-only diagnostics for browser checks and performance inspection.
window.portfolio={stats:()=>space?.stats(),get activeCollection(){return active;}};
