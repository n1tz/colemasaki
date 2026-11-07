import './showcase.css';
import { arrow, motionIcon, vectorizeArrows } from './icons.js';
import { isVideo, videoFrame, storeLink } from './game.js';
import { fontSpecimen } from './font-specimen.js';
import { MOBILE_QUERY } from './viewport.js';
import { arrangeGallery } from './gallery-layout.js';
const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');

export function gameFeature(collection,index,{mobile=false}={}){
  if(mobile){
    const poster=collection.items[0];
    return `<button class="mobile-game-card" data-showcase-enter="${index}" aria-label="Explore ${escape(collection.label)} — trailer and screenshots">
      <span class="mobile-game-card-meta">FEATURED GAME <span>${collection.storeUrl?'ON STEAM':'STEAM — COMING SOON'}</span></span>
      <img src="${escape(poster.src)}" width="${poster.width}" height="${poster.height}" alt="${escape(poster.alt)}" decoding="async">
      <span class="mobile-game-card-title"><strong>${escape(collection.label)}</strong>${arrow('↗')}</span>
      <span class="mobile-game-card-caption">Watch the trailer & explore the game</span></button>`;
  }
  return `<button class="game-feature" data-showcase-enter="${index}" aria-label="Explore ${escape(collection.label)} — trailer and screenshots">
    <img class="game-feature-background" src="${escape(collection.hero||collection.items[0]?.src)}" alt="" fetchpriority="high">
    <span class="game-feature-shade"></span>
    <span class="game-feature-kicker">${pad(index+1)} / INDEPENDENT GAME <span>${collection.storeUrl?'ON STEAM':'COMING SOON TO STEAM'}</span></span>
    ${collection.logo?`<img class="game-feature-logo" src="${escape(collection.logo)}" alt="${escape(collection.label)}">`:`<strong class="game-feature-name">${escape(collection.label)}</strong>`}
    <span class="game-feature-bottom"><span>BY COLE MASAKI</span><strong class="game-feature-cta"><span class="game-feature-cta-label">Explore the game</span><span class="game-feature-cta-icon">${arrow('→')}</span></strong></span>
  </button>`;
}

export function createShowcase(collections,{onSelect,onOpen}){
  const root=document.createElement('section');root.className='portfolio-showcase';root.hidden=true;root.tabIndex=-1;
  document.querySelector('#app').append(root);
  const mobile=matchMedia(MOBILE_QUERY),gameIndex=collections.findIndex(c=>c.id==='game'&&c.items.length);
  let view=null, disposeGallery;
  for(const path of [collections[gameIndex]?.hero,collections[gameIndex]?.logo].filter(Boolean)){
    const image=new Image();image.src=path;image.decode().catch(()=>{});
  }
  function stopMedia(){disposeGallery?.();disposeGallery=null;root.querySelectorAll('video').forEach(video=>{video.pause();video.removeAttribute('src');video.load();});}
  const footer=()=>`<footer class="showcase-footer"><span>© COLE MASAKI</span><button data-showcase-top>Back to top ${arrow('↑')}</button></footer>`;
  const back=label=>`<div class="collection-back"><button data-showcase-enter="-1">${arrow('←')} All collections</button><span>${escape(label)}</span></div>`;
  function workCard(collection,ci,item,i,{eager=false,number=i+1}={}){
    const title=item.title||(collection.id==='zine'?`Page ${pad(i+1)}`:`Work ${pad(i+1)}`);
    return `<article class="collection-work ${item.width/item.height>=1.6?'is-wide':''}" data-work-id="${escape(item.id)}" id="work-${escape(item.id)}">
      <button class="collection-image" data-showcase-work="${ci},${i}" aria-label="Enlarge ${escape(item.alt)}"><img src="${escape(item.src)}" alt="${escape(item.alt)}" width="${item.width}" height="${item.height}" loading="${eager?'eager':'lazy'}" decoding="async"></button>
      <div class="collection-work-info"><span class="collection-work-number">${pad(number)}</span><div><h2>${escape(title)}</h2>${item.description?`<p>${escape(item.description)}</p>`:''}</div>${item.url?`<a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="${collection.id==='websites'?'Visit website':'View project'}: ${escape(title)}">${collection.id==='websites'?'Visit website':'View project'} ${arrow('↗')}</a>`:''}</div>
    </article>`;
  }
  function renderOverview(){
    root.innerHTML=`<div class="showcase-heading"><h1>Selected work</h1><span>${pad(collections.length)} COLLECTIONS / ${collections.reduce((n,c)=>n+c.items.length,0)} WORKS</span></div>
      ${gameIndex>=0?gameFeature(collections[gameIndex],gameIndex):''}
      <div class="showcase-more"><h2>More collections</h2><span>${pad(collections.length-(gameIndex>=0?1:0))} COLLECTIONS</span></div>
      <div class="showcase-collections">${collections.map((c,i)=>i===gameIndex?'':`<button class="showcase-card" data-showcase-enter="${i}">
        <span class="showcase-card-image">${c.items[0]?`<img src="${escape(c.items[0].src)}" alt="${escape(c.items[0].alt)}" loading="lazy">`:'<span>Coming soon</span>'}</span>
        <span class="showcase-card-title"><span class="showcase-card-number">${pad(i+1)}</span><span class="showcase-card-name">${escape(c.label)}</span>${arrow('↗')}</span>
      </button>`).join('')}</div>${footer()}`;
  }
  function renderCollection(index){
    const c=collections[index];
    root.innerHTML=`${back(`${pad(index+1)} / COLLECTION`)}<header class="collection-heading"><div><h1>${escape(c.label)}</h1>${c.intro?`<p>${escape(c.intro)}</p>`:''}</div><span>${pad(c.items.length)} ${c.id==='zine'?'PAGES':c.id==='fonts'?'TYPEFACES':'WORKS'}</span></header>
      ${c.id==='fonts'?'<div class="collection-fonts"></div>':c.items.length?`<div class="collection-gallery curated-gallery collection-${escape(c.id)}" aria-label="${escape(c.label)} — all work">${c.items.map((item,i)=>workCard(c,index,item,i,{eager:i<3})).join('')}</div>`:'<p class="collection-empty">New work coming soon.</p>'}${footer()}`;
    if(c.id==='fonts')root.querySelector('.collection-fonts').replaceChildren(...c.items.map(item=>fontSpecimen(item,{compact:true,instance:'collection'})));
    else if(c.items.length)disposeGallery=arrangeGallery(root.querySelector('.curated-gallery'),c.items,c.id);
    vectorizeArrows(root);
  }
  function renderGame(){
    const game=collections[gameIndex],trailer=game.items.find(isVideo);
    const shots=game.items.flatMap((item,index)=>isVideo(item)?[]:[{item,index}]);
    root.innerHTML=`${back('INDEPENDENT GAME / COLE MASAKI')}
      <header class="game-page-banner"><img class="game-page-background" src="${escape(game.hero)}" alt=""><h1><img src="${escape(game.logo)}" alt="${escape(game.label)}"></h1></header>
      <div class="game-page-columns"><div class="game-page-gallery">
        <div class="game-media-label"><span>${trailer?'REVEAL TRAILER':'GAME PREVIEW'}</span><span>${game.items.filter(i=>!isVideo(i)).length} SCREENSHOTS BELOW</span></div>
        <div class="game-media-stage" id="game-trailer"></div>
        ${storeLink(game,'store-link game-steam')}
        <nav class="game-media-thumbs" aria-label="Jump to trailer or screenshot">${game.items.map((item,i)=>`<button data-showcase-slide="${i}" aria-label="${escape(item.title||item.alt)}"><img src="${escape(item.thumb)}" alt=""><span>${isVideo(item)?`${motionIcon(true)} TRAILER`:`SCREENSHOT ${pad(i)}`}</span></button>`).join('')}</nav>
      </div><aside class="game-page-about"><h2>${escape(game.label)}</h2><p>${escape(game.intro)}</p><dl><div><dt>DEVELOPER</dt><dd>Cole Masaki</dd></div><div><dt>RELEASE</dt><dd>${game.storeUrl?'See Steam for details':'Coming soon'}</dd></div><div><dt>STORE</dt><dd>Steam</dd></div></dl><p class="game-page-note">${game.storeUrl?'Visit Steam for release details.':'The Steam page will be linked here as soon as it is available.'}</p></aside></div>
      <div class="showcase-more"><h2>In-game screenshots</h2><span>CLICK TO ENLARGE</span></div><div class="collection-gallery game-screenshots">${shots.map(({item,index},i)=>workCard(game,gameIndex,item,index,{number:i+1})).join('')}</div>${footer()}`;
    const stage=root.querySelector('.game-media-stage');
    if(trailer)stage.append(videoFrame(trailer,'game-inline-video'));
    else if(game.items[0]){const img=new Image();img.src=game.items[0].src;img.alt=game.items[0].alt;stage.append(img);}
    vectorizeArrows(root);
  }
  const behavior=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
  root.addEventListener('click',event=>{
    const enter=event.target.closest('[data-showcase-enter]');if(enter){onSelect(Number(enter.dataset.showcaseEnter));return;}
    const work=event.target.closest('[data-showcase-work]');if(work){root.querySelectorAll('video').forEach(video=>video.pause());onOpen(...work.dataset.showcaseWork.split(',').map(Number));return;}
    const thumb=event.target.closest('[data-showcase-slide]');if(thumb){const item=collections[gameIndex].items[Number(thumb.dataset.showcaseSlide)];const target=isVideo(item)?root.querySelector('#game-trailer'):root.querySelector(`[data-work-id="${CSS.escape(item.id)}"]`);target?.scrollIntoView({behavior:behavior(),block:'start'});return;}
    if(event.target.closest('[data-showcase-top]')){if(mobile.matches)window.scrollTo({top:0,behavior:behavior()});else root.scrollTo({top:0,behavior:behavior()});}
  });
  root.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
  return {select(index,overviewReady,ready=true){
    const next=index===gameIndex&&gameIndex>=0?'game':index>=0&&!mobile.matches?`collection:${index}`:index<0&&overviewReady?'overview':null;
    const changed=next!==view;
    if(changed){stopMedia();root.replaceChildren();view=next;if(next==='game')renderGame();else if(next==='overview')renderOverview();else if(next)renderCollection(index);root.scrollTop=0;}
    const wasHidden=root.hidden;
    // Share the mobile header/menu/footer on the game page as well.
    const host=mobile.matches&&next==='game'?document.querySelector('#mobile-content'):document.querySelector('#app');
    if(host&&root.parentElement!==host)host.append(root);
    root.hidden=!next||!ready;root.classList.toggle('is-game',next==='game');
    root.setAttribute('aria-label',index>=0?`${collections[index].label} — all work`:'Selected portfolio work');
    root.classList.toggle('presentation-enter',Boolean(next&&ready));
    if(next&&ready&&(changed||wasHidden))root.focus({preventScroll:true});
    document.querySelector('#app').classList.toggle('showcase-mode',Boolean(next&&ready));
    document.querySelector('#app').classList.toggle('game-page-mode',next==='game'&&ready);
  },get visible(){return !root.hidden;}};
}
