// Video Game collection helpers: the trailer slide and the store-page button.
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const isVideo=item=>item?.type==='video'&&Boolean(item.youtube);
export const youtubeWatchUrl=item=>`https://www.youtube.com/watch?v=${encodeURIComponent(item.youtube)}`;

export function videoFrame(item,className='view-video'){
  const frame=document.createElement('iframe');
  frame.className=className;
  frame.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.youtube)}?rel=0&playsinline=1`;
  frame.title=item.title||item.alt||'Video';
  frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen=true;
  frame.referrerPolicy='strict-origin-when-cross-origin';
  return frame;
}

// Shown even before the store page exists, so the button's place stays constant.
export function storeLink(collection,className='store-link'){
  const url=collection.storeUrl;
  return /^https:\/\//.test(url||'')
    ?`<a class="${className}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">GO TO STORE PAGE <span>↗</span></a>`
    :`<span class="${className} is-pending" aria-disabled="true">STORE PAGE — COMING SOON</span>`;
}
