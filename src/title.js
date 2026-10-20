// Stable letter widths keep the heading centered while its glyphs resolve.
export function createTitle(heading, reducedMotion) {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@%*+<>/{}[]';
  let timer, target='';
  function fit(){
    heading.style.fontSize='';
    const run=heading.firstElementChild;if(!run)return;
    const width=run.getBoundingClientRect().width,available=heading.clientWidth;
    if(width>available)heading.style.fontSize=`${parseFloat(getComputedStyle(heading).fontSize)*available/width}px`;
  }
  function set(text,{animate=true,delay=0}={}){
    clearTimeout(timer);target=text;
    heading.setAttribute('aria-label',text);
    const run=document.createElement('span');run.className='title-run';run.setAttribute('aria-hidden','true');
    const letters=[...text].map(char=>{
      const slot=document.createElement('span');slot.className='title-letter';
      const measure=document.createElement('b');measure.textContent=char;
      const glyph=document.createElement('i');glyph.textContent=animate&&!reducedMotion?'':char;
      slot.append(measure,glyph);run.append(slot);return {char,glyph};
    });
    heading.replaceChildren(run);fit();
    if(!animate||reducedMotion){heading.dataset.resolving='false';return;}
    heading.dataset.resolving='true';
    const start=performance.now()+delay;
    function tick(){
      const elapsed=performance.now()-start;
      let complete=true;
      letters.forEach(({char,glyph},index)=>{
        const local=elapsed-index*42;
        if(char===' '){glyph.textContent=' ';return;}
        if(local>=310){glyph.textContent=char;return;}
        complete=false;
        glyph.textContent=local<0?'':alphabet[Math.floor(Math.random()*alphabet.length)];
      });
      if(complete)heading.dataset.resolving='false';else timer=setTimeout(tick,65);
    }
    tick();
  }
  const observer=new ResizeObserver(fit);observer.observe(heading.parentElement);
  document.fonts.ready.then(fit);
  return {set,get target(){return target;}};
}
