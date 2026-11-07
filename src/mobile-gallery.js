import './mobile-gallery.css';
import { gameFeature } from './showcase.js';
import { vectorizeArrows } from './icons.js';
import { MOBILE_QUERY } from './viewport.js';
import { fontSpecimen } from './font-specimen.js';

// A touch-first presentation of the same manifest. Desktop stays in the 3D scene.
// Phones get no 3D at all; the layout reuses the desktop presentation's panels
// (collection-back, collection-heading, showcase-heading/-more, showcase-card,
// collection-work) so both share one design language.
export function createMobileGallery(collections, { onSelect, onOpen, site, hasAbout }) {
  const media = matchMedia(MOBILE_QUERY);
  const root = document.createElement('div');
  root.className = 'mobile-gallery';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2,'0');
  const titleCase = text => text.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
  const total = collections.reduce((n,c)=>n+c.items.length,0);
  const unit = c => c.id==='zine'?'PAGES':c.id==='fonts'?'TYPEFACES':'WORKS';
  // [data-index] and [data-about] are handled by main.js, which owns both dialogs.
  // Same anatomy as the desktop sidebar's About box: small kicker, display label, arrow.
  const shortcuts = `<div class="mobile-shortcuts"><button class="mobile-shortcut" data-index aria-haspopup="dialog"><span><small>ALL ${total} WORKS</small><strong>Work index</strong></span>↗</button>${hasAbout?'<button class="mobile-shortcut" data-about aria-haspopup="dialog"><span><small>THE PERSON BEHIND THE WORK</small><strong>About Cole Masaki</strong></span>↗</button>':''}</div>`;
  let active = -1, large = true;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.innerHTML = `
    <a class="mobile-skip" href="#mobile-content">Skip to artwork</a>
    <header class="mobile-header">
      <button class="mobile-home" aria-label="Cole Masaki — all collections"><img src="/favicon.svg" width="28" height="28" alt=""><span>COLE MASAKI<small>${escape(site.headerLine)}</small></span></button>
      <button class="mobile-menu-button" aria-haspopup="dialog" aria-controls="mobile-menu"><span>Collections</span><span class="mobile-menu-icon" aria-hidden="true">＋</span></button>
    </header>
    <main id="mobile-content" tabindex="-1"></main>
    <footer class="mobile-footer">${shortcuts}
      <div class="mobile-social"><a href="${escape(site.instagram)}" target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a><span>© COLE MASAKI<br>${pad(total)} FILES / ${pad(collections.length)} COLLECTIONS</span></div>
      <div class="showcase-footer"><span>© COLE MASAKI</span><button class="mobile-top">Back to top ↑</button></div>
    </footer>
    <dialog id="mobile-menu" aria-labelledby="mobile-menu-title">
      <div class="mobile-menu-head"><h2 id="mobile-menu-title">Collections</h2><button class="mobile-menu-close" aria-label="Close collections">Close ×</button></div>
      <nav class="mobile-nav" aria-label="Mobile collections"><div class="nav-heading"><span>COLLECTIONS</span><span>00—${pad(collections.length)}</span></div>
      <button data-room="-1"><span>00</span><strong>Overview</strong><span>↗</span></button>
      ${collections.map((c,i)=>`<button data-room="${i}"><span>${pad(i+1)}</span><strong>${escape(c.label)}${!c.items.length?'<small>To be added</small>':''}</strong><span>${c.items.length?pad(c.items.length):'—'}</span></button>`).join('')}</nav>
      ${shortcuts}
    </dialog>`;
  document.querySelector('#app').append(root);
  const content = root.querySelector('#mobile-content'), menu = root.querySelector('#mobile-menu'), menuButton = root.querySelector('.mobile-menu-button');
  function image(item, eager = false, sizes = large?'100vw':'50vw') {
    return `<img src="${escape(item.thumb)}" srcset="${escape(item.thumb)} 640w, ${escape(item.src)} 2000w" sizes="${sizes}" width="${item.width}" height="${item.height}" alt="${escape(item.alt)}" loading="${eager?'eager':'lazy'}" decoding="async">`;
  }
  const back = (index, label = `${pad(index+1)} / COLLECTION`) => `<div class="collection-back"><button class="mobile-back">← All collections</button><span>${escape(label)}</span></div>`;
  const heading = c => `<header class="collection-heading"><div><h1 tabindex="-1">${escape(c.label)}</h1>${c.intro?`<p>${escape(c.intro)}</p>`:''}</div><span>${pad(c.items.length)} ${unit(c)}</span></header>`;
  // The desktop work card: bordered image, then number / title / description / link.
  function work(c, item, i) {
    const title = item.title || `${c.id==='zine'?'Page':'Work'} ${pad(i+1)}`;
    const link = large && item.url ? `<a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="${c.id==='websites'?'Visit website':'View project'}: ${escape(title)}">${c.id==='websites'?'Visit website':'View project'} ↗</a>` : '';
    return `<article class="collection-work mobile-art"><button class="collection-image" data-mobile-work="${i}" aria-label="Open ${escape(item.alt)}">${image(item,i<2)}</button>
      <div class="collection-work-info"><span class="collection-work-number">${pad(i+1)}</span><div><h2>${escape(title)}</h2>${large&&item.description?`<p>${escape(item.description)}</p>`:''}</div>${link}</div></article>`;
  }
  function render() {
    if (!media.matches) return;
    root.querySelectorAll('[data-room]').forEach(b => {if(Number(b.dataset.room)===active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    if(active < 0){
      const game = collections.findIndex(c=>c.id==='game'&&c.items.length);
      content.innerHTML=`<aside class="mobile-desktop-note" aria-label="Viewing note"><span class="mobile-note-kicker"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="12"/><path d="M8 20h8M12 16v4"/></svg>Best on desktop</span><p>This portfolio is built around an interactive 3D gallery. Visit on a desktop for the full experience. Every work is still here in this mobile layout.</p></aside>
        <header class="collection-heading mobile-landing"><div><span class="mobile-kicker">${escape(site.headerLine)}</span><h1 tabindex="-1">${escape(titleCase(site.tagline))}</h1></div><span>00 / OVERVIEW</span></header>
        <div class="showcase-heading" id="mobile-collections" tabindex="-1"><h2>Selected work</h2><span>${pad(collections.length)} COLLECTIONS<br>${total} WORKS</span></div>
        ${game>=0?gameFeature(collections[game],game,{mobile:true}):''}
        <div class="showcase-more"><h2>More work</h2><span>${escape(site.headerLine)}</span></div>
        <div class="showcase-collections">${collections.map((c,ci)=>ci===game?'':`<button class="showcase-card ${!c.items.length?'is-empty':''}" data-enter="${ci}" aria-label="${escape(c.label)}, ${c.items.length?`${c.items.length} ${unit(c).toLowerCase()}`:'coming soon'}">
          <span class="showcase-card-image">${c.items[0]?image(c.items[0],false,'50vw'):'<span>Coming soon</span>'}</span>
          <span class="showcase-card-title"><span><small>${pad(ci+1)} / ${c.items.length?`${pad(c.items.length)} ${unit(c)}`:'SOON'}</small>${escape(c.label)}</span>↗</span>
        </button>`).join('')}</div>`;
    }else{
      const c=collections[active];
      if(c.id==='game'){
        // The shared game page owns the inline player on every viewport.
        const shared=content.querySelector('.portfolio-showcase');
        // Media-query listeners can fire in either order on an orientation change.
        // Keep the shared player if main.js has already moved it into this host.
        for(const child of [...content.childNodes])if(child!==shared)child.remove();
      }else if(c.id==='fonts'){
        content.innerHTML=`${back(active)}${heading(c)}<div class="mobile-fonts"></div>`;
        content.querySelector('.mobile-fonts').replaceChildren(...c.items.map(item=>fontSpecimen(item,{compact:true})));
      }else{
        content.innerHTML=`${back(active)}${heading(c)}
          ${c.items.length?`<div class="mobile-browse"><span>Tap a work to enlarge</span><div class="mobile-density" role="group" aria-label="Artwork layout"><button data-density="grid" aria-pressed="${!large}">Grid</button><button data-density="large" aria-pressed="${large}">Large</button></div></div>
          <div class="mobile-art-grid ${large?'is-large':''}" aria-label="${escape(c.label)} artwork">${c.items.map((item,i)=>work(c,item,i)).join('')}</div>`:'<p class="mobile-empty">No work added yet.</p>'}`;
      }
    }
    vectorizeArrows(content);
  }
  function closeMenu(){menu.close();menuButton.focus({preventScroll:true});}
  menuButton.onclick=()=>menu.showModal();
  root.querySelector('.mobile-menu-close').onclick=closeMenu;
  menu.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom)closeMenu();}});
  root.addEventListener('click', e=>{
    if(e.target.closest('.portfolio-showcase'))return;
    if(e.target.closest('[data-index],[data-about]')){e.preventDefault();if(menu.open)menu.close();return;}
    if(e.target.closest('.mobile-skip')){
      e.preventDefault();const target=active<0?root.querySelector('#mobile-collections'):content;
      target.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});target.focus({preventScroll:true});return;
    }
    const room=e.target.closest('[data-room],[data-enter],[data-showcase-enter],.mobile-home,.mobile-back');
    if(room){if(menu.open)menu.close();onSelect(Number(room.dataset.room??room.dataset.enter??room.dataset.showcaseEnter??-1));return;}
    const workButton=e.target.closest('[data-mobile-work]');if(workButton){onOpen(active,Number(workButton.dataset.mobileWork));return;}
    const density=e.target.closest('[data-density]');if(density){large=density.dataset.density==='large';render();root.querySelector(`[data-density="${large?'large':'grid'}"]`).focus({preventScroll:true});return;}
    if(e.target.closest('.mobile-top')){scrollTo({top:0,behavior:'instant'});content.querySelector('h1')?.focus({preventScroll:true});}
  });
  media.addEventListener('change',()=>{if(!media.matches&&menu.open)menu.close();render();});
  vectorizeArrows(root);
  render();
  return {select(index){const changed=active!==index;active=index;render();if(media.matches&&changed){scrollTo({top:0,behavior:'instant'});content.querySelector('h1')?.focus({preventScroll:true});}}};
}
