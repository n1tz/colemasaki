import './trailer-player.css';

const svg=paths=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">${paths}</svg>`;
const icons={
  play:svg('<path d="m8 5 11 7-11 7Z"/>'),
  pause:svg('<path d="M8 5v14M16 5v14"/>'),
  sound:svg('<path d="M11 4 5 9H2v6h3l6 5Z M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'),
  mute:svg('<path d="M11 4 5 9H2v6h3l6 5Z M16 9l6 6m0-6-6 6"/>'),
  expand:svg('<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>'),
  collapse:svg('<path d="M3 9h6V3m6 0v6h6M9 21v-6H3m12 6v-6h6"/>')
};
const time=seconds=>Number.isFinite(seconds)?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:'--:--';

// Keep the native media element (and native iOS fullscreen) beneath a small,
// accessible control strip. All listeners belong to this disposable player.
export function trailerPlayer(video){
  const player=document.createElement('div');
  player.className=`trailer-player ${video.className}-player`;
  player.setAttribute('role','group');
  player.setAttribute('aria-label',video.getAttribute('aria-label'));
  player.innerHTML=`<div class="trailer-screen"></div>
    <div class="trailer-controls">
      <input class="trailer-seek" type="range" min="0" max="100" step="0.1" value="0" aria-label="Trailer position" disabled>
      <div class="trailer-toolbar">
        <button type="button" class="trailer-play" aria-label="Play trailer">${icons.play}<span>Play</span></button>
        <span class="trailer-time" aria-hidden="true">0:00 / --:--</span>
        <div class="trailer-audio">
          <button type="button" class="trailer-mute" aria-label="Mute trailer">${icons.sound}</button>
          <input class="trailer-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Trailer volume">
        </div>
        <button type="button" class="trailer-fullscreen" aria-label="Enter fullscreen">${icons.expand}</button>
      </div>
    </div><p class="trailer-status" role="status" hidden></p>`;
  player.querySelector('.trailer-screen').append(video);
  const play=player.querySelector('.trailer-play'),mute=player.querySelector('.trailer-mute');
  const seek=player.querySelector('.trailer-seek'),volume=player.querySelector('.trailer-volume');
  const fullscreen=player.querySelector('.trailer-fullscreen'),status=player.querySelector('.trailer-status');
  function message(text='') {status.textContent=text;status.hidden=!text;}
  function playbackError(){
    message('Unable to play the trailer. ');
    const link=document.createElement('a');link.href=video.src;link.textContent='Open video directly';status.append(link);
  }
  function syncTime(){
    const duration=video.duration,ready=Number.isFinite(duration)&&duration>0;
    seek.disabled=!ready;
    seek.max=ready?duration:100;
    seek.value=video.currentTime;
    seek.setAttribute('aria-valuetext',`${time(video.currentTime)} of ${time(duration)}`);
    seek.style.setProperty('--played',`${ready?100*video.currentTime/duration:0}%`);
    player.querySelector('.trailer-time').textContent=`${time(video.currentTime)} / ${time(duration)}`;
  }
  function syncPlayback(){
    const paused=video.paused||video.ended;
    play.innerHTML=`${paused?icons.play:icons.pause}<span>${video.ended?'Replay':paused?'Play':'Pause'}</span>`;
    play.setAttribute('aria-label',video.ended?'Replay trailer':paused?'Play trailer':'Pause trailer');
  }
  async function toggle(){
    if(!video.paused){video.pause();return;}
    message();
    try{await video.play();}catch(error){if(error.name!=='AbortError')playbackError();}
  }
  play.addEventListener('click',toggle);
  video.addEventListener('click',toggle);
  seek.addEventListener('input',()=>{video.currentTime=Number(seek.value);syncTime();});
  mute.addEventListener('click',()=>{
    if(video.volume===0){video.volume=1;video.muted=false;}else video.muted=!video.muted;
  });
  volume.addEventListener('input',()=>{video.volume=Number(volume.value);video.muted=video.volume===0;});
  video.addEventListener('volumechange',()=>{
    const silent=video.muted||video.volume===0;
    mute.innerHTML=silent?icons.mute:icons.sound;
    mute.setAttribute('aria-label',silent?'Unmute trailer':'Mute trailer');
    volume.value=video.muted?0:video.volume;
  });
  for(const event of ['loadedmetadata','durationchange','timeupdate','emptied'])video.addEventListener(event,syncTime);
  for(const event of ['play','pause','ended'])video.addEventListener(event,syncPlayback);
  video.addEventListener('waiting',()=>message('Loading trailer…'));
  video.addEventListener('playing',()=>message());
  video.addEventListener('seeked',()=>message());
  video.addEventListener('error',playbackError);
  fullscreen.hidden=!document.fullscreenEnabled&&!video.webkitEnterFullscreen;
  fullscreen.addEventListener('click',async()=>{
    try{
      if(document.fullscreenElement===player)await document.exitFullscreen();
      else if(document.fullscreenEnabled)await player.requestFullscreen();
      else video.webkitEnterFullscreen();
    }catch{message('Fullscreen is unavailable in this browser.');}
  });
  player.addEventListener('fullscreenchange',()=>{
    const expanded=document.fullscreenElement===player;
    fullscreen.innerHTML=expanded?icons.collapse:icons.expand;
    fullscreen.setAttribute('aria-label',expanded?'Exit fullscreen':'Enter fullscreen');
  });
  // Prevent the portfolio's room/page shortcuts from handling media keystrokes.
  player.addEventListener('keydown',event=>event.stopPropagation());
  video.controls=false;
  video.tabIndex=-1;
  syncTime();
  return player;
}
