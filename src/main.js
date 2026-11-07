import './style.css';
import './sidebar.css';
import { vectorizeArrows, motionIcon } from './icons.js';
import allCollections from './content.json';
import site from './site.json';
import { createTitle } from './title.js';
import { createMobileGallery } from './mobile-gallery.js';
import { createShowcase } from './showcase.js';
import { MOBILE_QUERY } from './viewport.js';
import { fontSpecimen } from './font-specimen.js';
import { isVideo, videoFrame, storeLink, youtubeWatchUrl } from './game.js';
import './typography.css';
import './controls.css';
import { createViewerZoom } from './viewer-zoom.js';
import './viewer-zoom.css';

const $=s=>document.querySelector(s);
const pad=n=>String(n).padStart(2,'0');
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Collections hidden in the editor are left out entirely; numbering and keys follow the visible order.
const collections=allCollections.filter(c=>!c.hidden);
const tagline=(site.tagline||'PORTFOLIO LIBRARY').toUpperCase(), instagram=site.instagram||'https://www.instagram.com/colemasaki/';
const sentence=text=>text.charAt(0)+text.slice(1).toLowerCase();
// About text comes from site.json (edited in /admin). Paragraphs are separated by blank lines;
// experience and skills are one entry per line, split into two columns at "|".
const about=site.about||{};
const hasAbout=Boolean(about.intro||about.experience||about.skills);
const paragraphs=text=>String(text||'').split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean).map(p=>`<p>${escapeHTML(p).replace(/\n/g,'<br>')}</p>`).join('');
const rows=text=>String(text||'').split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const [term,...rest]=line.split('|');const detail=rest.join('|').trim();return `<div><dt>${escapeHTML(term.trim())}</dt>${detail?`<dd>${escapeHTML(detail)}</dd>`:''}</div>`;}).join('');
const aboutSection=(heading,key,kind)=>about[key]?.trim()?`<section><h3>${heading}</h3><dl class="about-rows ${kind}">${rows(about[key])}</dl></section>`:'';
const isZine=index=>collections[index]?.id==='zine';
const isGame=index=>collections[index]?.id==='game';
const total=collections.reduce((n,c)=>n+c.items.length,0);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let active=-1, space, viewing=null, returnFocus=null, motionEnabled=!reducedMotion, mobileGallery, overviewReady=false, presentationReady=false;
const mobileViewport=matchMedia(MOBILE_QUERY);
$('#app').innerHTML=`
  <div id="exhibition-frame"><nav class="collection-sides" aria-label="Artwork pages" hidden>
    <button id="collection-side-previous" aria-label="Previous group of artworks" title="Previous artworks"><svg viewBox="0 0 40 24" aria-hidden="true"><path d="M36 12H4M14 2L4 12l10 10"/></svg><span>PREV</span></button>
    <button id="collection-side-next" aria-label="Next group of artworks" title="Next artworks"><svg viewBox="0 0 40 24" aria-hidden="true"><path d="M4 12h32M26 2l10 10-10 10"/></svg><span>NEXT</span></button>
  </nav></div><main id="space" aria-label="Interactive 3D artwork gallery"></main>
  <div class="border" aria-hidden="true"></div>
  <header class="topline"><a class="site-logo" href="/" aria-label="Cole Masaki — overview"><img src="/favicon.svg" alt="" width="32" height="32" /></a><div class="top-actions"><span class="desktop">${escapeHTML(site.headerLine||'ART / DESIGN / INDEPENDENT WORK')}</span>${hasAbout?'<button class="top-about" data-about aria-haspopup="dialog">ABOUT</button>':''}<button id="help" aria-label="Navigation help">[ ? ]</button></div></header>
  <div class="brand"><h1 aria-label="COLE MASAKI">COLE MASAKI</h1><p><span class="smallcross">✳</span>${escapeHTML(site.subtitle||'PERSONAL WORK & SELECTED DESIGN')}</p></div>
  <nav class="collection-nav" aria-label="Collections"><div class="nav-heading"><span>COLLECTIONS</span><span>00—${pad(collections.length)}</span></div>
    <button class="category active" id="home" data-category="-1" aria-pressed="true"><span class="number">00</span><span class="category-label" data-short="Overview">Overview</span><span class="count">↗</span></button>
    ${collections.map((c,i)=>`<button class="category ${c.items.length?'':'pending'}" data-category="${i}" aria-pressed="false"><span class="number">${pad(i+1)}</span><span class="category-label" data-short="${escapeHTML(c.shortLabel||c.label)}">${escapeHTML(c.label)}${c.items.length?'':'<small>To be added</small>'}</span><span class="count">${c.items.length?pad(c.items.length):'—'}</span></button>`).join('')}
    <button class="index-button" id="open-index" data-index aria-haspopup="dialog">WORK INDEX <span>${pad(total)} ↗</span></button>
  </nav>
  <div id="markers" aria-hidden="true">${collections.map((c,i)=>`<button class="marker ${c.id==='game'?'marker-featured':''}" title="${escapeHTML(c.label)}" data-marker="${i}" tabindex="-1" style="--i:${i%4+(i>3?2:0)}"><span class="marker-name">${pad(i+1)} / ${escapeHTML(c.label.toUpperCase())}</span> <span class="marker-count">${pad(c.items.length)} ${c.id==='zine'?'PAGES':'WORKS'} ↗</span></button>`).join('')}</div>
  <section class="stage-caption" aria-live="polite"><div class="eyebrow" id="location">00 / OVERVIEW</div><h2 id="section-name">${escapeHTML(sentence(tagline))}.</h2><p id="section-info">Select a room to enter.</p><button id="view-collection" hidden>VIEW WORKS <span>↗</span></button></section>
  <div class="collection-pager" hidden><button id="collection-previous" aria-label="Previous group of artworks">←</button><span id="collection-range"></span><button id="collection-next" aria-label="Next group of artworks">→</button><span class="pager-store" hidden></span></div>
  <footer class="bottom-bar"><div class="camera-widget"><div class="controls" aria-label="Camera controls"><button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom-in" aria-label="Zoom in">+</button><button id="motion" aria-label="Pause animation" title="Pause animation" aria-pressed="true">Ⅱ</button></div><div class="instructions"><span>DRAG</span> ROTATE &nbsp; <span>SCROLL</span> <span id="scroll-action">MOVE</span><br><span>CLICK</span> <span id="click-action">ENTER COLLECTION</span> &nbsp; <button id="help-bottom">? CONTROLS</button></div></div><div class="bottom-right"><a href="${escapeHTML(instagram)}" target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a><div class="copyright">© COLE MASAKI<br>${pad(total)} FILES / ${pad(collections.length)} COLLECTIONS</div></div></footer>
  <div class="axis" aria-hidden="true"><svg viewBox="0 0 84 58"><g stroke="#b5b7aa" stroke-width=".7"><path d="M42 36V7M42 36L15 49M42 36L69 49"/><circle cx="42" cy="36" r="3" fill="#11120f"/></g><text x="38" y="6">Y</text><text x="6" y="54">X</text><text x="74" y="54">Z</text></svg></div>
  <button class="hero-entry" id="enter-portfolio">ENTER PORTFOLIO</button>
  <p class="hero-tagline" aria-hidden="true"></p>
  <div class="loading" role="status">LOADING WORKS…</div><div class="hover-label" hidden></div>
  <dialog class="viewer" aria-label="Artwork viewer"><div class="dialog-head"><span class="title" id="viewer-title"></span><button class="close" data-close="viewer" aria-label="Close artwork">CLOSE ×</button></div><div class="view-body"></div><aside class="viewer-info" id="viewer-info" aria-label="About this work" hidden><div class="viewer-info-head"><span>ABOUT THIS WORK</span><button class="viewer-info-close" aria-label="Hide description">HIDE ×</button></div><div class="viewer-info-body"><h3 id="viewer-info-title"></h3><p id="viewer-info-text"></p></div></aside><div class="viewer-store" hidden></div><div class="viewer-footer"><div class="pager"><button id="previous" aria-label="Previous work">←</button><span class="page-label" aria-live="polite" aria-atomic="true"></span><button id="next" aria-label="Next work">→</button></div><input id="page-range" type="range" min="1" aria-label="Go to zine page" hidden><div class="secondary"><button id="info-toggle" aria-controls="viewer-info" aria-expanded="false" hidden>INFO</button><button id="image-zoom" aria-pressed="false">ZOOM +</button><a id="original" target="_blank" rel="noopener">OPEN IMAGE ↗</a></div></div></dialog>
  <dialog class="index-dialog" aria-label="Work index"><div class="dialog-head"><span class="title">WORK INDEX / ${total} FILES</span><button class="close" data-close="index-dialog" aria-label="Close index">CLOSE ×</button></div><div class="index-content">${collections.map((c,ci)=>`<section class="index-section"><h3><span>${pad(ci+1)}</span>${escapeHTML(c.label)}</h3>${c.items.length?`<div class="index-grid">${c.items.map((item,i)=>`<button class="index-item" data-work="${ci},${i}"><img src="${item.thumb}" alt="${escapeHTML(item.alt)}" loading="lazy"><span>${escapeHTML(item.title||(c.id==='zine'?'PAGE ':'WORK ')+pad(i+1))}</span></button>`).join('')}</div>`:'<p>No work added yet.</p>'}</section>`).join('')}</div></dialog>
  ${hasAbout?`<dialog class="about-dialog" aria-labelledby="about-name"><div class="dialog-head"><span class="title">ABOUT</span><button class="close" data-close="about-dialog" aria-label="Close about">CLOSE ×</button></div><div class="about-content">
    <div class="about-main"><h2 id="about-name">Cole Masaki</h2>${about.role?`<p class="about-role">${escapeHTML(about.role)}</p>`:''}<div class="about-text">${paragraphs(about.intro)}</div>${about.status?`<p class="about-status">${escapeHTML(about.status)}</p>`:''}
      <div class="about-links"><button class="primary" data-index>WORK INDEX ↗</button>${about.email?`<a href="mailto:${escapeHTML(about.email)}">EMAIL ${escapeHTML(about.email)} ↗</a>`:''}${about.resume?`<a href="${escapeHTML(about.resume)}" target="_blank" rel="noopener">RÉSUMÉ ↗</a>`:''}<a href="${escapeHTML(instagram)}" target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a></div></div>
    <div class="about-side">${aboutSection('Experience','experience','experience')}${aboutSection('Skills & tools','skills','skills')}</div>
  </div></dialog>`:''}
  <dialog class="help-dialog" aria-label="Navigation help"><div class="dialog-head"><span class="title">NAVIGATION</span><button class="close" data-close="help-dialog" aria-label="Close help">CLOSE ×</button></div><div class="help-content"><dl><dt>Rotate</dt><dd>Drag / one finger</dd><dt>Browse work</dt><dd>Scroll the page / touch swipe</dd><dt>Zoom background</dt><dd>Sidebar + / −</dd><dt>Enter collection</dt><dd>Sidebar / collection preview</dd><dt>Open work</dt><dd>Click an artwork</dd><dt>Change collection</dt><dd>Menu / keys 1–${collections.length}</dd><dt>Overview</dt><dd>Key 0 / overview button</dd><dt>Previous / next work</dt><dd>Left / right arrow keys in the viewer</dd><dt>Artwork description</dt><dd>Key I / Info in the viewer</dd><dt>Close viewer</dt><dd>Escape</dd><dt>Pause animation</dt><dd>Ⅱ in the camera controls</dd></dl><p>Use the work index for direct access to every image. The zine reads in page order; select an image to enlarge it.</p></div></dialog>
`;

const sidebar=document.createElement('aside');sidebar.className='desktop-sidebar';sidebar.setAttribute('aria-label','Portfolio navigation and 3D controls');
sidebar.innerHTML='<a class="sidebar-brand" href="/" aria-label="Cole Masaki — home"><img src="/favicon.svg" width="30" height="30" alt=""><span>COLE MASAKI<small>ART / DESIGN / INDEPENDENT WORK</small></span></a>';
sidebar.append($('.collection-nav'),$('.bottom-bar'));$('#app').append(sidebar);
$('.bottom-bar').append($('.camera-widget'));
const aboutLink=document.createElement('button');aboutLink.className='sidebar-about';aboutLink.dataset.about='';aboutLink.setAttribute('aria-haspopup','dialog');aboutLink.hidden=!hasAbout;
aboutLink.innerHTML='<span><small>THE PERSON BEHIND THE WORK</small><strong>About Cole Masaki</strong></span><span aria-hidden="true">↗</span>';
$('.collection-nav').after(aboutLink);
const controlsHeading=document.createElement('div');controlsHeading.className='sidebar-section-label';controlsHeading.innerHTML='<span>3D SPACE</span><button id="help-bottom" aria-label="Navigation help" aria-haspopup="dialog" title="Navigation help">?</button>';$('.controls').before(controlsHeading);
$('.instructions').remove();
$('#zoom-out').setAttribute('aria-label','Zoom background out');$('#zoom-in').setAttribute('aria-label','Zoom background in');
$('#app').classList.add('overview-route');
const showcase=createShowcase(collections,{onSelect:select,onOpen:openWork});
vectorizeArrows($('#app'));
// Desktop viewer zoom (wheel/pinch at cursor, drag to pan, click to toggle).
// Phones keep the native pinch-zoom and swipe paging below, untouched.
$('#image-zoom').insertAdjacentHTML('beforebegin','<span class="zoom-hint" aria-hidden="true">Scroll to zoom · Drag to move</span><div class="zoom-controls" role="group" aria-label="Zoom" hidden><button id="art-zoom-out" aria-label="Zoom out" title="Zoom out (−)">−</button><button id="art-zoom-level" aria-label="Fit to screen" title="Fit to screen (0)">100%</button><button id="art-zoom-in" aria-label="Zoom in" title="Zoom in (+)">+</button></div>');
const artZoom=createViewerZoom($('.view-body'),{reducedMotion,onChange:state=>{
  $('.zoom-controls').hidden=!state;if(!state)return;
  $('#art-zoom-level').textContent=`${state.percent}%`;$('#art-zoom-out').disabled=state.atFit;$('#art-zoom-in').disabled=state.atMax;$('#art-zoom-level').disabled=state.atFit;
}});
$('#art-zoom-in').onclick=()=>artZoom.zoomIn();$('#art-zoom-out').onclick=()=>artZoom.zoomOut();$('#art-zoom-level').onclick=()=>artZoom.fit();

const title=createTitle($('.brand h1'),reducedMotion);
const taglineTitle=createTitle($('.hero-tagline'),reducedMotion);
let titleReady=false;
const titleText=()=>active<0?'COLE MASAKI':collections[active].label.toUpperCase();
title.set(titleText(),{animate:false});
taglineTitle.set(tagline,{animate:false});

function select(index,updateHash=true){
  const changed=index!==active;
  active=index;
  document.documentElement.dataset.theme=isGame(index)?'game':'portfolio';
  $('#app').classList.toggle('overview-route',index<0);
  if(index<0)overviewReady=true;
  if(index>=0)$('#app').classList.remove('hero','hero-intro');
  if(changed)title.set(titleText(),{animate:titleReady});
  $('#app').classList.toggle('focused',index>=0);
  document.querySelectorAll('.category').forEach(b=>{const selected=Number(b.dataset.category)===index;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
  $('#location').textContent=index<0?'00 / OVERVIEW':`${pad(index+1)} / ROOM`;
  $('#section-name').textContent=index<0?`${sentence(tagline)}.`:collections[index].label;
  const intro=index>=0&&collections[index].intro?`<span class="section-intro">${escapeHTML(collections[index].intro)}</span>`:'';
  $('#section-info').innerHTML=intro+(index<0?'Select a room to enter.':collections[index].id==='fonts'?'02 custom typefaces / Try the fonts and download.':collections[index].items.length?`${pad(collections[index].items.length)} ${isZine(index)?'pages':'works'} / Click an image to open.`:'No work added yet.');
  $('#view-collection').hidden=index<0||isGame(index)||!collections[index].items.length;
  $('#view-collection').innerHTML=collections[index]?.id==='fonts'?'TRY FONTS <span>↗</span>':isZine(index)?'READ ZINE <span>↗</span>':isGame(index)&&isVideo(collections[index].items[0])?'WATCH TRAILER <span>↗</span>':'VIEW WORKS <span>↗</span>';
  $('.pager-store').hidden=!isGame(index);$('.pager-store').innerHTML=isGame(index)?storeLink(collections[index]):'';vectorizeArrows($('.pager-store'));
  vectorizeArrows($('#view-collection'));
  presentationReady=mobileViewport.matches||!space||reducedMotion;
  if(!mobileViewport.matches){
    if(!space)initializeSpace();
    space?.select(index);
  }
  mobileGallery?.select(index);
  syncShowcase();
  pauseForDialog();
  if(isGame(index))finishLoading();
  if(!reducedMotion){
    document.querySelectorAll('.stage-caption > *').forEach((el,i)=>{el.getAnimations().forEach(a=>a.cancel());el.animate([{opacity:0,transform:'translateY(24px)',clipPath:'inset(100% 0 0)'},{opacity:1,transform:'none',clipPath:'inset(0)'}],{duration:700,delay:i*65,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});});
  }
  if(updateHash)history[mobileViewport.matches&&changed?'pushState':'replaceState'](null,'',index<0?location.pathname:`#${collections[index].id}`);
}
function syncShowcase(){
  $('#app').classList.toggle('archive-shell',!mobileViewport.matches&&(active>=0||overviewReady));
  showcase.select(active,overviewReady&&!mobileViewport.matches,presentationReady||mobileViewport.matches);
  space?.setPresentation(true);
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
  artZoom.detach();
  const desktopZoom=!mobileViewport.matches;$('.viewer').toggleAttribute('data-zoomable',desktopZoom);
  $('.view-body').className='view-body';
  $('.view-body').replaceChildren(...items.map(item=>{if(isFont)return fontSpecimen(item);if(video)return videoFrame(item);const image=new Image();image.src=item.src;image.alt=item.alt;if(!desktopZoom)image.addEventListener('click',toggleZoom);image.addEventListener('error',()=>{artZoom.detach();const p=document.createElement('p');p.className='image-error';p.textContent='Image could not load. Close and try again.';image.replaceWith(p);});return image;}));
  if(desktopZoom&&!isFont&&!video)artZoom.attach($('.view-body img'),item.width,item.height);
  $('.view-body').scrollTop=0;
  $('.view-body').scrollLeft=0;
  $('.page-label').textContent=`${pad(index+1)} / ${pad(collection.items.length)}`;
  $('#previous').disabled=index===0;$('#next').disabled=index+items.length>=collection.items.length;
  $('#original').href=isFont?item.download:video?(item.videoSrc||youtubeWatchUrl(item)):item.url||item.src;
  if(isFont){$('#original').setAttribute('download',`${item.fontFamily}.ttf`);$('#original').removeAttribute('target');}else{$('#original').removeAttribute('download');$('#original').target='_blank';}
  $('#original').textContent=isFont?'DOWNLOAD TTF ↓':video?(item.videoSrc?'OPEN TRAILER ↗':'WATCH ON YOUTUBE ↗'):item.url?(collection.id==='websites'?'VISIT WEBSITE ↗':item.url?.includes('instagram.com/')?'VIEW POST ↗':'VIEW PROJECT ↗'):'OPEN IMAGE ↗';
  vectorizeArrows($('#original'));
  $('#image-zoom').hidden=video;$('#image-zoom').textContent='ZOOM +';$('#image-zoom').setAttribute('aria-pressed','false');
  renderInfo(isFont?'':item.description,item.title||(isZine(category)?`Page ${pad(index+1)}`:''));
  $('#page-range').hidden=!isZine(category);$('#page-range').max=collection.items.length;$('#page-range').value=index+1;
  // Only adjacent full-size assets are prefetched; the scene uses small textures.
  const next=collection.items[index+items.length];if(next&&!isVideo(next)){const preload=new Image();preload.src=next.src;}
}
// Descriptions sit beside the artwork on desktop and in a pull-up sheet on phones; the artwork is never
// covered or shrunk unless the visitor asks. On desktop the panel opens by itself only where it costs
// the image nothing (a portrait piece on a wide screen), and an explicit choice is remembered.
const INFO_WIDTH=340;
let infoChoice=null,infoOpen=false;
const describedItem=()=>viewing&&!$('#info-toggle').hidden;
function infoFitsBeside(){
  const item=collections[viewing.category].items[viewing.index],body=$('.view-body');
  if(!item?.width||!item?.height||$('.view-body').classList.contains('zoomed'))return false;
  const gutter=44,w=body.clientWidth+(infoOpen?INFO_WIDTH:0)-gutter,h=body.clientHeight-gutter;
  const full=Math.min(w/item.width,h/item.height,1),beside=Math.min((w-INFO_WIDTH)/item.width,h/item.height,1);
  return beside>=full*.98;
}
function setInfo(open){
  infoOpen=Boolean(open)&&describedItem();
  $('.viewer').classList.toggle('info-open',infoOpen);
  $('#viewer-info').hidden=!infoOpen;
  $('#info-toggle').setAttribute('aria-expanded',String(infoOpen));
  $('#info-toggle').textContent=infoOpen?'INFO −':'INFO +';
}
function autoInfo(){
  if(!describedItem())return setInfo(false);
  if(infoChoice!==null)return setInfo(infoChoice);
  setInfo(!mobileViewport.matches&&infoFitsBeside());
}
function renderInfo(text,title){
  $('#info-toggle').hidden=!text;
  $('#viewer-info-title').textContent=title||'';$('#viewer-info-title').hidden=!title;
  $('#viewer-info-text').textContent=text||'';
  $('.viewer-info-body').scrollTop=0;
  // Measure after the dialog has laid out.
  requestAnimationFrame(autoInfo);
}
function toggleInfo(){infoChoice=!infoOpen;setInfo(infoChoice);if(infoOpen&&mobileViewport.matches)$('.viewer-info-close').focus({preventScroll:true});}
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
document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('close',()=>{if(dialog===$('.viewer')){artZoom.detach();viewing=null;$('.view-body').replaceChildren();setInfo(false);if(mobileViewport.matches)infoChoice=null;}pauseForDialog();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);}});});
$('#zoom-in').onclick=()=>space?.zoom(.8);$('#zoom-out').onclick=()=>space?.zoom(1.25);
function updateMotionButton(){const label=motionEnabled?'Pause animation':'Resume animation';$('#motion').innerHTML=motionIcon(!motionEnabled);$('#motion').setAttribute('aria-pressed',String(motionEnabled));$('#motion').setAttribute('aria-label',label);$('#motion').title=label;}
$('#motion').disabled=reducedMotion;updateMotionButton();$('#motion').onclick=()=>{motionEnabled=!motionEnabled;space?.setMotion(motionEnabled);updateMotionButton();};
$('#enter-portfolio').onclick=()=>space?.setHero(1);
// The work index and About can be opened from several places; one dialog at a time.
function openIndex(){if($('.about-dialog')?.open)closeDialog($('.about-dialog'));showDialog('.index-dialog');}
let aboutReturnURL=null;
function openAbout(){
  const dialog=$('.about-dialog');if(!dialog||dialog.open)return;
  if($('.index-dialog').open)closeDialog($('.index-dialog'));
  // #about is linkable; closing restores whatever address was showing before.
  if(location.hash!=='#about'){aboutReturnURL=location.pathname+location.search+location.hash;history.replaceState(null,'','#about');}
  showDialog('.about-dialog');dialog.querySelector('.about-content').scrollTop=0;
}
$('.about-dialog')?.addEventListener('close',()=>{if(location.hash==='#about')history.replaceState(null,'',aboutReturnURL??location.pathname+location.search);aboutReturnURL=null;});
document.addEventListener('click',e=>{const el=e.target.closest('[data-index],[data-about]');if(!el||!e.target.closest('#app'))return;if('about' in el.dataset)openAbout();else openIndex();});$('#help').onclick=$('#help-bottom').onclick=()=>showDialog('.help-dialog');
$('#view-collection').onclick=()=>openWork(active,0);$('#previous').onclick=()=>turnPage(-1);$('#next').onclick=()=>turnPage(1);$('#image-zoom').onclick=toggleZoom;
$('#info-toggle').onclick=toggleInfo;$('.viewer-info-close').onclick=()=>{infoChoice=false;setInfo(false);$('#info-toggle').focus({preventScroll:true});};
addEventListener('resize',()=>{if(viewing)autoInfo();});
$('#page-range').oninput=e=>{viewing.index=Number(e.target.value)-1;renderWork();};
addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select,video,[contenteditable="true"]'))return;
  if(document.querySelector('dialog[open]')){if($('.viewer').open&&e.target.tagName!=='INPUT'){if(e.key==='ArrowLeft'){e.preventDefault();turnPage(-1);}if(e.key==='ArrowRight'){e.preventDefault();turnPage(1);}if((e.key==='i'||e.key==='I')&&describedItem()){e.preventDefault();toggleInfo();}if(artZoom.attached){if(e.key==='+'||e.key==='='){e.preventDefault();artZoom.zoomIn();}if(e.key==='-'||e.key==='_'){e.preventDefault();artZoom.zoomOut();}if(e.key==='0'){e.preventDefault();artZoom.fit();}}}return;}
  if(active<0&&!mobileViewport.matches&&!showcase.visible){if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();space?.setHero(1);}}
  if(/^[0-9]$/.test(e.key)&&Number(e.key)<=collections.length)select(Number(e.key)-1);
  if(e.key==='+'||e.key==='=')space?.zoom(.8);if(e.key==='-')space?.zoom(1.25);
});
function finishLoading(){ if(location.hash==='#about')requestAnimationFrame(openAbout); if(!titleReady){titleReady=true;title.set(titleText(),{delay:650});taglineTitle.set(taglineTitle.target,{delay:650});} $('.loading').hidden=true;$('#app').inert=false;const boot=$('#boot');if(boot){boot.classList.add('ready');setTimeout(()=>boot.remove(),reducedMotion?0:750);} }
function fallback(message){finishLoading();overviewReady=true;presentationReady=true;syncShowcase();$('#markers').hidden=true;const div=document.createElement('div');div.className='fallback';const text=document.createElement('p');text.textContent=message;const button=document.createElement('button');button.textContent='OPEN WORK INDEX ↗';vectorizeArrows(button);button.onclick=openIndex;div.append(text,button);$('#space').append(div);}
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
    space=createSpace($('#space'),collections,{onOpen:openWork,onSelect:select,onHover,onPage,reducedMotion,onHero:value=>$('#app').classList.toggle('hero',value&&active<0),onPresentation:({index,ready})=>{if(index!==active)return;presentationReady=ready;if(index<0&&ready)overviewReady=true;syncShowcase();},onHeroIntro:value=>{$('#app').classList.toggle('hero-intro',value);if(value&&titleReady)taglineTitle.set(taglineTitle.target);},onProgress:value=>{const boot=$('#boot');if(boot){boot.style.setProperty('--progress',value);$('#boot-percent').textContent=Math.round(value*100)+'%';}},onReady:message=>{if(message)fallback(message);else finishLoading();}});
    if(active>=0||overviewReady)space.select(active,true);
    space.setPresentation(true);
    space.setMotion(motionEnabled);pauseForDialog();
  }).catch(error=>{console.warn('3D unavailable:',error);fallback('The 3D view is unavailable on this device. All artwork is available in the work index.');});
  return spaceLoading;
}

mobileGallery=createMobileGallery(collections,{onSelect:select,onOpen:openWork,hasAbout,site:{headerLine:site.headerLine||'ART / DESIGN / INDEPENDENT WORK',tagline,instagram}});
if(mobileViewport.matches||location.hash==='#game')finishLoading();
if(!mobileViewport.matches)initializeSpace();
mobileViewport.addEventListener('change',()=>{
  if(viewing)renderWork();
  presentationReady=true;syncShowcase();
  if(mobileViewport.matches){space?.setPaused(true);finishLoading();}
  else{initializeSpace();space?.select(active,true);pauseForDialog();}
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
// Pull the description sheet down by its header to put it away.
let sheetTouch=null;
$('.viewer-info-head').addEventListener('touchstart',e=>{sheetTouch=e.touches.length===1?e.touches[0].clientY:null;},{passive:true});
$('.viewer-info-head').addEventListener('touchend',e=>{if(sheetTouch!==null&&mobileViewport.matches&&e.changedTouches[0].clientY-sheetTouch>40){infoChoice=false;setInfo(false);}sheetTouch=null;},{passive:true});

const route=collections.findIndex(c=>c.id===location.hash.slice(1));if(route>=0)select(route,false);
addEventListener('hashchange',()=>{if(location.hash==='#about'){aboutReturnURL=location.pathname+location.search;return openAbout();}if($('.about-dialog')?.open)$('.about-dialog').close();select(collections.findIndex(c=>c.id===location.hash.slice(1)),false);});
// Read-only diagnostics for browser checks and performance inspection.
window.portfolio={stats:()=>space?.stats(),get activeCollection(){return active;}};
