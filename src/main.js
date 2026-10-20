import './style.css';
import collections from './content.json';
import { createSpace } from './scene.js';

const $=s=>document.querySelector(s);
const pad=n=>String(n).padStart(2,'0');
const total=collections.reduce((n,c)=>n+c.items.length,0);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let active=-1, space, viewing=null, returnFocus=null, motionEnabled=!reducedMotion;
$('#app').innerHTML=`
  <div id="exhibition-frame" aria-hidden="true"></div><main id="space" aria-label="Interactive 3D artwork gallery"></main>
  <div class="border" aria-hidden="true"></div>
  <header class="topline"><span>PORTFOLIO / COLE MASAKI</span><div class="top-actions"><span class="desktop">ART / DESIGN / INDEPENDENT WORK</span><button id="help" aria-label="Navigation help">[ ? ]</button></div></header>
  <div class="brand"><h1>COLE<span>MASAKI</span></h1><p><span class="smallcross">✳</span>PERSONAL WORK & SELECTED DESIGN</p></div>
  <nav class="collection-nav" aria-label="Collections"><div class="nav-heading"><span>COLLECTIONS</span><span>01—05</span></div>
    ${collections.map((c,i)=>`<button class="category ${c.items.length?'':'pending'}" data-category="${i}" aria-pressed="false"><span class="number">${pad(i+1)}</span><span class="category-label" data-short="${['2D Work','Logos','Zine','Game','Drawing'][i]}">${c.label}${c.items.length?'':'<small>To be added</small>'}</span><span class="count">${c.items.length?pad(c.items.length):'—'}</span></button>`).join('')}
    <button class="index-button" id="open-index">WORK INDEX <span>↗</span></button>
  </nav>
  <div id="markers" aria-hidden="true">${collections.map((c,i)=>`<button class="marker" data-marker="${i}" tabindex="-1">${pad(i+1)} / ${c.id==='personal'?'2D PERSONAL WORK':c.label.toUpperCase()} <span class="marker-count">${pad(c.items.length)} ${c.id==='zine'?'PAGES':'WORKS'} ↗</span></button>`).join('')}</div>
  <section class="stage-caption" aria-live="polite"><div class="eyebrow" id="location">00 / OVERVIEW</div><h2 id="section-name">Portfolio library.</h2><p id="section-info">Select a room to enter.</p><button id="view-collection" hidden>VIEW WORKS <span>↗</span></button></section>
  <div class="collection-pager" hidden><button id="collection-previous" aria-label="Previous group of artworks">←</button><span id="collection-range"></span><button id="collection-next" aria-label="Next group of artworks">→</button></div>
  <footer class="bottom-bar"><div><div class="controls" aria-label="Camera controls"><button class="home" id="home" aria-label="Return to overview">↖ OVERVIEW</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom-in" aria-label="Zoom in">+</button><button id="motion" aria-label="Pause animation" title="Pause animation" aria-pressed="true">Ⅱ</button></div><div class="instructions"><span>DRAG</span> ROTATE &nbsp; <span>SCROLL</span> ZOOM<br><span>CLICK</span> <span id="click-action">ENTER COLLECTION</span> &nbsp; <button id="help-bottom">? CONTROLS</button></div></div><div class="bottom-right"><a href="https://www.instagram.com/colemasaki/" target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a><div class="copyright">© COLE MASAKI<br>${pad(total)} FILES / 05 COLLECTIONS</div></div></footer>
  <div class="axis" aria-hidden="true"><svg viewBox="0 0 84 58"><g stroke="#b5b7aa" stroke-width=".7"><path d="M42 36V7M42 36L15 49M42 36L69 49"/><circle cx="42" cy="36" r="3" fill="#11120f"/></g><text x="38" y="6">Y</text><text x="6" y="54">X</text><text x="74" y="54">Z</text></svg></div>
  <div class="loading" role="status">LOADING WORKS…</div><div class="hover-label" hidden></div>
  <dialog class="viewer" aria-label="Artwork viewer"><div class="dialog-head"><span class="title" id="viewer-title"></span><button class="close" data-close="viewer" aria-label="Close artwork">CLOSE ×</button></div><div class="view-body"></div><div class="viewer-footer"><div class="pager"><button id="previous" aria-label="Previous work">←</button><span class="page-label"></span><button id="next" aria-label="Next work">→</button></div><input id="page-range" type="range" min="1" aria-label="Go to zine page" hidden><div class="secondary"><button id="image-zoom" aria-pressed="false">ZOOM +</button><a id="original" target="_blank" rel="noopener">OPEN IMAGE ↗</a></div></div></dialog>
  <dialog class="index-dialog" aria-label="Work index"><div class="dialog-head"><span class="title">WORK INDEX / ${total} FILES</span><button class="close" data-close="index-dialog" aria-label="Close index">CLOSE ×</button></div><div class="index-content">${collections.map((c,ci)=>`<section class="index-section"><h3><span>${pad(ci+1)}</span>${c.label}</h3>${c.items.length?`<div class="index-grid">${c.items.map((item,i)=>`<button class="index-item" data-work="${ci},${i}"><img src="${item.thumb}" alt="${item.alt}" loading="lazy"><span>${c.id==='zine'?'PAGE':'WORK'} ${pad(i+1)}</span></button>`).join('')}</div>`:'<p>No work added yet.</p>'}</section>`).join('')}</div></dialog>
  <dialog class="help-dialog" aria-label="Navigation help"><div class="dialog-head"><span class="title">NAVIGATION</span><button class="close" data-close="help-dialog" aria-label="Close help">CLOSE ×</button></div><div class="help-content"><dl><dt>Rotate</dt><dd>Drag / one finger</dd><dt>Zoom</dt><dd>Scroll / pinch / + −</dd><dt>Enter collection</dt><dd>Click a collection preview</dd><dt>Open work</dt><dd>Click an artwork</dd><dt>Change collection</dt><dd>Menu / keys 1–5</dd><dt>Overview</dt><dd>Key 0 / overview button</dd><dt>Previous / next work</dt><dd>← → in the viewer</dd><dt>Close viewer</dt><dd>Escape</dd><dt>Pause animation</dt><dd>Ⅱ in the camera controls</dd></dl><p>Use the work index for direct access to every image. The zine reads in page order; select an image to enlarge it.</p></div></dialog>
`;

function select(index,updateHash=true){
  const heading=$('.brand h1');heading.getAnimations().forEach(a=>a.cancel());const before=heading.getBoundingClientRect();
  active=index;
  $('#app').classList.toggle('focused',index>=0);
  document.querySelectorAll('.category').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index));});
  $('#location').textContent=index<0?'00 / OVERVIEW':`${pad(index+1)} / ROOM`;
  $('#section-name').textContent=index<0?'Portfolio library.':collections[index].label;
  $('#section-info').innerHTML=index<0?'Select a room to enter.':collections[index].items.length?`${pad(collections[index].items.length)} ${index===2?'pages':'works'} / Click an image to open.`:'No work added yet.';
  $('#view-collection').hidden=index<0||!collections[index].items.length;
  $('#view-collection').innerHTML=index===2?'READ ZINE <span>↗</span>':'VIEW WORKS <span>↗</span>';
  $('#click-action').textContent=index<0?'ENTER COLLECTION':'OPEN WORK';
  space?.select(index);
  if(!reducedMotion){
    const after=heading.getBoundingClientRect();
    heading.animate([{transform:`translate(${before.left-after.left}px,${before.top-after.top}px) scale(${before.width/after.width},${before.height/after.height})`},{transform:'none'}],{duration:1000,easing:'cubic-bezier(.16,1,.3,1)'});
    document.querySelectorAll('.stage-caption > *').forEach((el,i)=>{el.getAnimations().forEach(a=>a.cancel());el.animate([{opacity:0,transform:'translateY(24px)',clipPath:'inset(100% 0 0)'},{opacity:1,transform:'none',clipPath:'inset(0)'}],{duration:700,delay:i*65,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});});
  }
  if(updateHash)history.replaceState(null,'',index<0?location.pathname:`#${collections[index].id}`);
}
function pauseForDialog(){space?.setPaused(Boolean(document.querySelector('dialog[open]')));}
function showDialog(selector){returnFocus=document.activeElement;$(selector).showModal();pauseForDialog();}
function closeDialog(dialog){dialog.close();pauseForDialog();returnFocus?.focus();}
function spreadMode(){return viewing?.category===2&&innerWidth>800;}
function renderWork(){
  const {category,index}=viewing;const collection=collections[category];const item=collection.items[index];
  const spread=spreadMode()&&index>0&&index<collection.items.length-1;
  const items=spread?[item,collection.items[index+1]].filter(Boolean):[item];
  $('#viewer-title').textContent=`${pad(category+1)} / ${collection.label}${category===2?' / John Voynich’s Guide to the Basics':''}`;
  $('.view-body').className=`view-body${spread?' spread':''}`;
  $('.view-body').replaceChildren(...items.map(item=>{const image=new Image();image.src=item.src;image.alt=item.alt;image.addEventListener('click',toggleZoom);image.addEventListener('error',()=>{const p=document.createElement('p');p.className='image-error';p.textContent='Image could not load. Close and try again.';image.replaceWith(p);});return image;}));
  $('.page-label').textContent=`${pad(index+1)}${spread?'–'+pad(index+2):''} / ${pad(collection.items.length)}`;
  $('#previous').disabled=index===0;$('#next').disabled=index+items.length>=collection.items.length;
  $('#original').href=item.src;
  $('#image-zoom').textContent='ZOOM +';$('#image-zoom').setAttribute('aria-pressed','false');
  $('#page-range').hidden=category!==2;$('#page-range').max=collection.items.length;$('#page-range').value=index+1;
  // Only adjacent full-size assets are prefetched; the scene uses small textures.
  const next=collection.items[index+items.length];if(next){const preload=new Image();preload.src=next.src;}
}
function openWork(category,index){
  onHover(null);
  if($('.index-dialog').open)closeDialog($('.index-dialog'));
  viewing={category,index};
  if(spreadMode()&&index>0&&index<collections[category].items.length-1&&index%2===0)viewing.index--;
  renderWork();showDialog('.viewer');
}
function turnPage(direction){
  if(!viewing)return;
  const count=collections[viewing.category].items.length;
  let next=viewing.index+direction;
  if(spreadMode())next=direction>0?(viewing.index===0?1:viewing.index+2):(viewing.index<=1?0:viewing.index-2);
  viewing.index=Math.max(0,Math.min(count-1,next));renderWork();
}
function toggleZoom(){const zoomed=$('.view-body').classList.toggle('zoomed');$('#image-zoom').textContent=zoomed?'FIT −':'ZOOM +';$('#image-zoom').setAttribute('aria-pressed',String(zoomed));}
function onHover(data,x=0,y=0){const label=$('.hover-label');label.hidden=!data;if(!data)return;label.textContent=active<0?`${collections[data.category].label} / ENTER ↗`:`${pad(data.category+1)}.${pad(data.item+1)} / OPEN ↗`;label.style.left=`${Math.min(x+18,innerWidth-160)}px`;label.style.top=`${y+18}px`;}
document.querySelectorAll('[data-category],[data-marker]').forEach(el=>el.addEventListener('click',()=>select(Number(el.dataset.category??el.dataset.marker))));
document.querySelectorAll('[data-work]').forEach(el=>el.addEventListener('click',()=>openWork(...el.dataset.work.split(',').map(Number))));
document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>closeDialog($(`.${el.dataset.close}`))));
document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('close',()=>{if(dialog===$('.viewer'))viewing=null;pauseForDialog();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);}});});
$('#home').onclick=()=>select(-1);$('#zoom-in').onclick=()=>space?.zoom(.8);$('#zoom-out').onclick=()=>space?.zoom(1.25);
function updateMotionButton(){const label=motionEnabled?'Pause animation':'Resume animation';$('#motion').textContent=motionEnabled?'Ⅱ':'▷';$('#motion').setAttribute('aria-pressed',String(motionEnabled));$('#motion').setAttribute('aria-label',label);$('#motion').title=label;}
$('#motion').disabled=reducedMotion;updateMotionButton();$('#motion').onclick=()=>{motionEnabled=!motionEnabled;space?.setMotion(motionEnabled);updateMotionButton();};
$('#open-index').onclick=()=>showDialog('.index-dialog');$('#help').onclick=$('#help-bottom').onclick=()=>showDialog('.help-dialog');
$('#view-collection').onclick=()=>openWork(active,0);$('#previous').onclick=()=>turnPage(-1);$('#next').onclick=()=>turnPage(1);$('#image-zoom').onclick=toggleZoom;
$('#page-range').oninput=e=>{let index=Number(e.target.value)-1;if(spreadMode()&&index>0&&index%2===0&&index<collections[viewing.category].items.length-1)index--;viewing.index=index;renderWork();};
addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]')){if($('.viewer').open&&e.target.tagName!=='INPUT'){if(e.key==='ArrowLeft'){e.preventDefault();turnPage(-1);}if(e.key==='ArrowRight'){e.preventDefault();turnPage(1);}}return;}
  if(e.key.match(/^[0-5]$/))select(Number(e.key)-1);
  if(e.key==='+'||e.key==='=')space?.zoom(.8);if(e.key==='-')space?.zoom(1.25);
});
let wasWide=innerWidth>800;addEventListener('resize',()=>{const changed=wasWide!==(innerWidth>800);wasWide=innerWidth>800;if(viewing&&changed){if(spreadMode()&&viewing.index>0&&viewing.index%2===0&&viewing.index<collections[viewing.category].items.length-1)viewing.index--;renderWork();}});
function finishLoading(){ $('.loading').hidden=true;$('#app').inert=false;const boot=$('#boot');if(boot){boot.classList.add('ready');setTimeout(()=>boot.remove(),reducedMotion?0:750);} }
function fallback(message){finishLoading();$('#markers').hidden=true;const div=document.createElement('div');div.className='fallback';const text=document.createElement('p');text.textContent=message;const button=document.createElement('button');button.textContent='OPEN WORK INDEX ↗';button.onclick=()=>showDialog('.index-dialog');div.append(text,button);$('#space').append(div);}
function onPage(layout){$('.collection-pager').hidden=!layout||layout.pages<2;if(!layout)return;$('#collection-range').textContent=`${pad(layout.start+1)}–${pad(layout.end)} / ${pad(collections[active]?.items.length??0)}`;$('#collection-previous').disabled=layout.page===0;$('#collection-next').disabled=layout.page===layout.pages-1;}
$('#collection-previous').onclick=()=>space?.turnExhibition(-1);$('#collection-next').onclick=()=>space?.turnExhibition(1);
$('#app').inert=true;
try{space=createSpace($('#space'),collections,{onOpen:openWork,onSelect:select,onHover,onPage,reducedMotion,onProgress:value=>{const boot=$('#boot');if(boot){boot.style.setProperty('--progress',value);$('#boot-percent').textContent=Math.round(value*100)+'%';}},onReady:message=>{if(message)fallback(message);else finishLoading();}});}catch(error){console.warn('3D unavailable:',error);fallback('The 3D view is unavailable on this device. All artwork is available in the work index.');}
const route=collections.findIndex(c=>c.id===location.hash.slice(1));if(route>=0)select(route,false);
addEventListener('hashchange',()=>select(collections.findIndex(c=>c.id===location.hash.slice(1)),false));
// Read-only diagnostics for browser checks and performance inspection.
window.portfolio={stats:()=>space?.stats(),get activeCollection(){return active;}};
