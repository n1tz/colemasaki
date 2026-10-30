import './mobile-gallery.css';
import { vectorizeArrows, motionIcon } from './icons.js';
import { MOBILE_QUERY } from './viewport.js';
import { fontSpecimen } from './font-specimen.js';
import { isVideo, videoFrame, storeLink } from './game.js';

// A touch-first presentation of the same manifest. Desktop stays in the 3D scene.
export function createMobileGallery(collections, { onSelect, onOpen }) {
  const media = matchMedia(MOBILE_QUERY);
  const root = document.createElement('div');
  root.className = 'mobile-gallery';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2,'0');
  let active = -1, large = false, kv=null, kvPaused=false, slide=0, slideTouch=null;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Items flagged showcase:false in the editor never appear in the animated preview.
  const inShowcase=item=>item.showcase!==false;
  // Pick across collections once per visit; keep the composition stable on return.
  const featured=collections.filter(c=>['professional','personal','logos'].includes(c.id)&&c.items.length).map(c=>c.items.filter(inShowcase)).filter(list=>list.length).map(list=>list[Math.floor(Math.random()*list.length)]).slice(0,3);
  const journeyWorks=collections.flatMap(c=>c.items.filter(inShowcase).map(item=>({...item,collectionId:c.id})));
  async function mountKV(){
    const host=root.querySelector('.mobile-kv-space');if(!host)return;
    try{
      const {createMobileKV}=await import('./mobile-kv.js');
      if(!host.isConnected||!media.matches||active>=0)return;
      kv=createMobileKV(host,journeyWorks,{reducedMotion});kv.setPaused(kvPaused);
    }catch(error){host.dataset.failed='true';const button=root.querySelector('.mobile-kv-pause');if(button){button.hidden=true;}console.warn('Mobile visual unavailable:',error);}
  }
  root.innerHTML = `
    <a class="mobile-skip" href="#mobile-content">Skip to artwork</a>
    <header class="mobile-header">
      <button class="mobile-home" aria-label="Cole Masaki — all collections"><img src="/favicon.svg" width="28" height="28" alt=""><span>COLE MASAKI</span></button>
      <button class="mobile-menu-button" aria-haspopup="dialog" aria-controls="mobile-menu">Collections <span aria-hidden="true">＋</span></button>
    </header>
    <main id="mobile-content" tabindex="-1"></main>
    <footer class="mobile-footer"><span>© COLE MASAKI</span><a href="https://www.instagram.com/colemasaki/" target="_blank" rel="noopener noreferrer">Instagram ↗</a><button class="mobile-top">Back to top ↑</button></footer>
    <dialog id="mobile-menu" aria-labelledby="mobile-menu-title">
      <div class="mobile-menu-head"><h2 id="mobile-menu-title">Collections</h2><button class="mobile-menu-close" aria-label="Close collections">Close ×</button></div>
      <nav aria-label="Mobile collections"><button data-room="-1"><span>00</span><strong>All collections</strong><span>↗</span></button>
      ${collections.map((c,i)=>`<button data-room="${i}"><span>${pad(i+1)}</span><strong>${escape(c.label)}${!c.items.length?'<small>Coming later</small>':''}</strong><span>${c.items.length?pad(c.items.length):'—'}</span></button>`).join('')}</nav>
    </dialog>`;
  document.querySelector('#app').append(root);
  const content = root.querySelector('#mobile-content'), menu = root.querySelector('#mobile-menu'), menuButton = root.querySelector('.mobile-menu-button');
  function image(item, eager = false) {
    return `<img src="${escape(item.thumb)}" srcset="${escape(item.thumb)} 640w, ${escape(item.src)} 2000w" sizes="${large?'100vw':'(max-width:800px) 50vw, 400px'}" width="${item.width}" height="${item.height}" alt="${escape(item.alt)}" loading="${eager?'eager':'lazy'}" decoding="async">`;
  }
  function render() {
    kv?.dispose();kv=null;
    if (!media.matches) return;
    root.querySelectorAll('[data-room]').forEach(b => {if(Number(b.dataset.room)===active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    if(active < 0){
      content.innerHTML=`<div class="mobile-intro"><p>ART / DESIGN / INDEPENDENT WORK</p><h1 tabindex="-1">Portfolio Library</h1>
        <figure class="mobile-kv" aria-label="Animated artwork preview">
          <div class="mobile-kv-space" aria-hidden="true"><div class="mobile-kv-fallback">${featured.map(item=>image(item,true)).join('')}</div></div>
          <button class="mobile-kv-pause" aria-label="${kvPaused||reducedMotion?'Resume preview animation':'Pause preview animation'}" aria-pressed="${!(kvPaused||reducedMotion)}" ${reducedMotion?'disabled':''}>${motionIcon(kvPaused||reducedMotion)}</button>
          <figcaption><button class="mobile-kv-browse">Browse collections <span>↓</span></button></figcaption>
        </figure>
        <div class="mobile-meta" id="mobile-collections" tabindex="-1">${pad(collections.length)} COLLECTIONS <span>${collections.reduce((n,c)=>n+c.items.length,0)} WORKS</span></div></div>
        <div class="mobile-rooms">${collections.map((c,ci)=>`<button class="mobile-room ${!c.items.length?'is-empty':''}" data-enter="${ci}" aria-label="${escape(c.label)}, ${c.items.length} ${c.id==='zine'?'pages':'works'}">
          <span class="mobile-room-label"><span>${pad(ci+1)}</span><strong>${escape(c.label)}</strong><span>${c.items.length?pad(c.items.length):'SOON'} ↗</span></span>
          ${c.items.length?`<div class="mobile-room-preview">${c.items.slice(0,2).map((item,i)=>image(item,ci===0)).join('')}</div>`:''}
        </button>`).join('')}</div>`;
    }else{
      const c=collections[active];
      if(c.id==='game'){
        // One slide at a time: the trailer first, then screenshots, with the store button always below.
        slide=Math.min(slide,Math.max(0,c.items.length-1));
        const item=c.items[slide];
        content.innerHTML=`<div class="mobile-intro mobile-section"><button class="mobile-back">← All collections</button><h1 tabindex="-1">${escape(c.label)}</h1></div>
          <div class="mobile-game">${item?`<div class="mobile-game-slide">${isVideo(item)?'':`<button class="mobile-art" data-mobile-work="${slide}" aria-label="Open ${escape(item.alt)}">${image(item,true)}</button>`}</div>
          <div class="mobile-game-pager"><button data-game-step="-1" aria-label="Previous slide" ${slide===0?'disabled':''}>←</button><span aria-live="polite">${pad(slide+1)} / ${pad(c.items.length)}</span><button data-game-step="1" aria-label="Next slide" ${slide>=c.items.length-1?'disabled':''}>→</button></div>`:'<p class="mobile-empty">No work added yet.</p>'}
          ${storeLink(c,'store-link mobile-store')}</div>`;
        if(isVideo(item))content.querySelector('.mobile-game-slide').append(videoFrame(item,'mobile-game-video'));
      }else if(c.id==='fonts'){
        content.innerHTML=`<div class="mobile-intro mobile-section"><button class="mobile-back">← All collections</button><h1 tabindex="-1">Fonts</h1></div><div class="mobile-browse"><p>02 CUSTOM TYPEFACES <span>Type to try · Download TTF</span></p></div><div class="mobile-fonts"></div>`;
        content.querySelector('.mobile-fonts').replaceChildren(...c.items.map(item=>fontSpecimen(item,{compact:true})));
      }else{
      content.innerHTML=`<div class="mobile-intro mobile-section"><button class="mobile-back">← All collections</button><h1 tabindex="-1">${escape(c.label)}</h1></div>
        <div class="mobile-browse"><p>${pad(c.items.length)} ${c.id==='zine'?'PAGES':'WORKS'}${c.items.length?' <span>· Tap to enlarge</span>':''}</p>${c.items.length?`<div class="mobile-density" role="group" aria-label="Artwork layout"><button data-density="grid" aria-pressed="${!large}">Grid</button><button data-density="large" aria-pressed="${large}">Large</button></div>`:''}</div>
        ${c.items.length?`<div class="mobile-art-grid ${large?'is-large':''}" aria-label="${escape(c.label)} artwork">${c.items.map((item,i)=>`<button class="mobile-art" data-mobile-work="${i}" aria-label="Open ${escape(item.alt)}"><span class="mobile-art-image">${image(item,i<4)}</span><span class="mobile-art-caption"><span>${c.id==='zine'?'PAGE ':''}${pad(i+1)}</span><span aria-hidden="true">↗</span></span></button>`).join('')}</div>`:'<p class="mobile-empty">No work added yet.</p>'}`;
      }
    }
    vectorizeArrows(root);
    if(active<0)mountKV();
  }
  function closeMenu(){menu.close();menuButton.focus({preventScroll:true});}
  menuButton.onclick=()=>menu.showModal();
  root.querySelector('.mobile-menu-close').onclick=closeMenu;
  menu.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom)closeMenu();}});
  root.addEventListener('click', e=>{
    if(e.target.closest('.mobile-kv-pause')){
      kvPaused=!kvPaused;kv?.setPaused(kvPaused);
      const button=root.querySelector('.mobile-kv-pause');button.innerHTML=motionIcon(kvPaused);button.setAttribute('aria-label',kvPaused?'Resume preview animation':'Pause preview animation');button.setAttribute('aria-pressed',String(!kvPaused));return;
    }
    if(e.target.closest('.mobile-kv-browse,.mobile-skip')){
      e.preventDefault();const target=active<0?root.querySelector('#mobile-collections'):content;
      target.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});target.focus({preventScroll:true});return;
    }
    const room=e.target.closest('[data-room],[data-enter],.mobile-home,.mobile-back');
    if(room){if(menu.open)menu.close();onSelect(Number(room.dataset.room??room.dataset.enter??-1));return;}
    const work=e.target.closest('[data-mobile-work]');if(work){onOpen(active,Number(work.dataset.mobileWork));return;}
    const step=e.target.closest('[data-game-step]');if(step){slide+=Number(step.dataset.gameStep);render();root.querySelector(`[data-game-step="${step.dataset.gameStep}"]`)?.focus({preventScroll:true});return;}
    const density=e.target.closest('[data-density]');if(density){large=density.dataset.density==='large';render();root.querySelector(`[data-density="${large?'large':'grid'}"]`).focus({preventScroll:true});return;}
    if(e.target.closest('.mobile-top')){scrollTo({top:0,behavior:'instant'});content.querySelector('h1').focus({preventScroll:true});}
  });
  root.addEventListener('touchstart',e=>{slideTouch=e.target.closest('.mobile-game-slide')&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
  root.addEventListener('touchend',e=>{
    if(!slideTouch)return;const t=e.changedTouches[0],dx=t.clientX-slideTouch.x,dy=t.clientY-slideTouch.y;slideTouch=null;
    const count=collections[active]?.items.length??0,next=slide+(dx<0?1:-1);
    if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5&&next>=0&&next<count){slide=next;render();}
  },{passive:true});
  media.addEventListener('change',()=>{if(!media.matches&&menu.open)menu.close();render();});
  vectorizeArrows(root);
  render();
  return {select(index){const changed=active!==index;active=index;if(changed)slide=0;render();if(media.matches&&changed){scrollTo({top:0,behavior:'instant'});content.querySelector('h1').focus({preventScroll:true});}}};
}
