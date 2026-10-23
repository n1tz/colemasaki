// Shuffle within collections, then interleave them: breadth without repeats.
export function createArtworkSequence(items, random = Math.random) {
  const unique=[...new Map(items.map(item=>[item.id,item])).values()];
  let deck=[],previous=null;
  function shuffle(values){for(let i=values.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;}
  function refill(){
    const groups=new Map();
    unique.forEach(item=>{const key=item.collectionId||'work';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);});
    const bins=shuffle([...groups.values()]).map(shuffle);
    while(bins.some(bin=>bin.length))for(const bin of bins)if(bin.length)deck.push(bin.pop());
    if(deck.length>1&&deck[0].id===previous)[deck[0],deck[1]]=[deck[1],deck[0]];
  }
  return ()=>{if(!unique.length)return null;if(!deck.length)refill();const next=deck.shift();previous=next.id;return next;};
}

export const STATION_SPACING=110;
export const SHOT_DURATION=4.8;
export const HOLD_DURATION=1.25;
export function stationAt(index){
  return {x:Math.sin(index*1.73)*48,y:Math.sin(index*1.19)*27,z:-index*STATION_SPACING,angle:Math.sin(index*1.41)*.7};
}
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*t*(10+t*(-15+6*t));
export function journeyAt(time){
  const index=Math.floor(time/SHOT_DURATION),phase=time-index*SHOT_DURATION;
  const progress=Math.max(0,(phase-HOLD_DURATION)/(SHOT_DURATION-HOLD_DURATION));
  const u=ease(progress),a=stationAt(index),b=stationAt(index+1);
  const arc=Math.sin(Math.PI*u),side=index%2?-1:1;
  const eye=s=>({x:s.x+Math.sin(s.angle)*48,y:s.y+2,z:s.z+Math.cos(s.angle)*48});
  const from=eye(a),to=eye(b);
  return {index,progress,position:index+u,travel:Math.sin(Math.PI*progress),
    x:mix(from.x,to.x,u)+side*30*arc,
    y:mix(from.y,to.y,u)+22*arc,
    z:mix(from.z,to.z,u),
    target:{x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),z:mix(a.z,b.z,u)}};
}

// Zero at both recycling boundaries; the current and next chamber stay opaque.
export function roomVisibility(relative){
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  return smooth(-1,-.65,relative)*(1-smooth(1.35,2,relative));
}
