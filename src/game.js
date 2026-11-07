// Video Game collection helpers: the trailer slide and the store-page button.
import { trailerPlayer } from './trailer-player.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const isVideo=item=>item?.type==='video'&&Boolean(item.videoSrc||item.youtube);
export const youtubeWatchUrl=item=>`https://www.youtube.com/watch?v=${encodeURIComponent(item.youtube)}`;

export function videoFrame(item,className='view-video'){
  if(item.videoSrc){
    const video=document.createElement('video');
    video.className=className;
    video.src=item.videoSrc;
    video.poster=item.src;
    video.controls=true;
    video.playsInline=true;
    video.preload='none';
    video.setAttribute('aria-label',item.title||item.alt||'Game trailer');
    video.textContent='Your browser does not support this video. Use the trailer link to watch it directly.';
    return trailerPlayer(video);
  }
  const frame=document.createElement('iframe');
  frame.className=className;
  frame.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.youtube)}?rel=0&playsinline=1`;
  frame.title=item.title||item.alt||'Video';
  frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen=true;
  frame.referrerPolicy='strict-origin-when-cross-origin';
  return frame;
}

// The whole store panel becomes a link when a Steam URL is available.
export function storeLink(collection,className='store-link'){
  const url=collection.storeUrl,available=/^https:\/\//.test(url||'');
  const icon=available
    ? '<svg class="store-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>'
    : '<svg class="store-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>';
  const content=`<span class="store-label"><span class="store-kicker">GAME STORE</span><strong>Steam</strong></span><span class="store-status"><span>${available?'Visit store':'Coming soon'}</span>${icon}</span>`;
  return available
    ?`<a class="${className}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${content}</a>`
    :`<span class="${className} is-pending" aria-disabled="true">${content}</span>`;
}
