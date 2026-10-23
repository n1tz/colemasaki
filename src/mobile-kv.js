import * as THREE from 'three';
import { createDepthField } from './depth-field.js';
import { createAsciiPass } from './ascii-pass.js';
import { createArtworkSequence, journeyAt, stationAt, roomVisibility } from './kv-journey.js';

// A continuous, bounded-cost journey. The camera travels; rooms and artwork
// are recycled only after passing behind it. No touch input interrupts scrolling.
export function createMobileKV(host, items, { reducedMotion=false }={}) {
  const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.autoClear=false;
  renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#11120f');
  const time={value:0},architecture=createDepthField(time,[[0,0,0]]);
  architecture.children[0].material.color.set('#69736a');
  const baseMaterials=architecture.children.map(object=>object.material);
  const rooms=[architecture,architecture.clone(),architecture.clone()];
  rooms.forEach(room=>{
    const visibility={value:0};room.userData.visibility=visibility;
    // Shared geometry and shader programs, only one scalar uniform per chamber.
    room.children.forEach(object=>{
      const source=object.material,material=source.clone();object.material=material;
      material.onBeforeCompile=shader=>{
        source.onBeforeCompile(shader);
        shader.uniforms.uRoomVisibility=visibility;
        shader.fragmentShader='uniform float uRoomVisibility;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('void main() {',`void main() {
          float threshold=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
          if(uRoomVisibility<=threshold)discard;
        `);
      };
      material.customProgramCacheKey=()=>source.customProgramCacheKey()+'-room-reveal';
    });
    scene.add(room);
  });
  const ascii=createAsciiPass(renderer),artScene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(43,1,.1,600);
  const plane=new THREE.PlaneGeometry(1,1),loader=new THREE.TextureLoader(),nextArtwork=createArtworkSequence(items);
  let disposed=false,visible=false,paused=reducedMotion,frame=0,last=0,draws=0,exchanges=0;
  const cards=[],seen=new Set(),direction=new THREE.Vector3(),local=new THREE.Vector3(),inverseCamera=new THREE.Quaternion();
  function assign(mesh){
    const item=nextArtwork();if(!item)return;
    const ticket=(mesh.userData.ticket||0)+1;mesh.userData.ticket=ticket;
    mesh.userData.item=item;mesh.userData.ratio=item.width/item.height;
    mesh.material.map?.dispose();mesh.material.map=null;mesh.material.opacity=0;mesh.visible=false;
    loader.load(item.thumb,texture=>{
      if(disposed||mesh.userData.ticket!==ticket){texture.dispose();return;}
      texture.colorSpace=THREE.SRGBColorSpace;renderer.initTexture(texture);
      mesh.userData.loadedAt=time.value;mesh.material.map=texture;mesh.material.needsUpdate=true;
      host.dataset.loaded=String(cards.filter(c=>c.material.map).length);if(paused||!visible)draw();
    },undefined,()=>{});
  }
  const stations=Array.from({length:3},(_,index)=>{
    const group=new THREE.Group();group.position.z=stationAt(index).z;artScene.add(group);
    const meshes=Array.from({length:2},(_,i)=>{
      const mesh=new THREE.Mesh(plane,new THREE.MeshBasicMaterial({transparent:true,opacity:0,toneMapped:false,side:THREE.DoubleSide,depthWrite:false}));
      mesh.userData.slot=i;group.add(mesh);cards.push(mesh);assign(mesh);return mesh;
    });
    return {group,meshes,index};
  });
  function draw(){
    if(disposed||!host.clientWidth)return;
    const t=time.value,path=journeyAt(t);
    camera.position.set(path.x,path.y,path.z);
    camera.lookAt(path.target.x,path.target.y,path.target.z);camera.updateMatrixWorld();inverseCamera.copy(camera.quaternion).invert();
    const narrow=Math.min(1,camera.aspect);
    stations.forEach((station,roomIndex)=>{
      const {group,meshes}=station;
      while(station.index<path.index){
        station.index+=stations.length;meshes.forEach(assign);exchanges++;
      }
      const center=stationAt(station.index);
      group.position.set(center.x,center.y,center.z);
      rooms[roomIndex].position.copy(group.position);
      rooms[roomIndex].rotation.y=center.angle;
      const reveal=roomVisibility(station.index-path.position);
      rooms[roomIndex].userData.visibility.value=reveal;
      rooms[roomIndex].visible=reveal>0;
      meshes.forEach((mesh,i)=>{
        const ratio=mesh.userData.ratio||1,size=18;
        // A composed pair in every chamber, level with the viewer's horizon.
        const x=(i===0?-9.4:9.4)*narrow;
        mesh.position.set(Math.cos(center.angle)*x,i===0?2:-2,-Math.sin(center.angle)*x);
        mesh.getWorldPosition(local);direction.copy(local).sub(camera.position).applyQuaternion(inverseCamera);
        const depth=-direction.z;
        const loadedReveal=paused?1:THREE.MathUtils.smoothstep(t-(mesh.userData.loadedAt??t),0,.5);
        const opacity=reveal*loadedReveal*THREE.MathUtils.smoothstep(depth,7,19)*(1-THREE.MathUtils.smoothstep(depth,150,240));
        mesh.visible=Boolean(mesh.material.map)&&opacity>.005;
        mesh.material.opacity=opacity;
        if(mesh.visible&&opacity>.3)seen.add(mesh.userData.item.id);
        mesh.scale.set(Math.min(size*narrow,size*ratio),Math.min(size,size*narrow/ratio),1);
        mesh.quaternion.copy(camera.quaternion);
        mesh.renderOrder=1000-Math.round(depth);
      });
    });
    // ASCII peaks mid-flight, then resolves into a clean artwork stop.
    const travel=reducedMotion?0:path.travel*.8;
    ascii.render(scene,camera,t,travel,true);renderer.clearDepth();renderer.render(artScene,camera);draws++;
    host.dataset.ready='true';
  }
  function tick(now){
    frame=0;
    if(disposed||paused||!visible||document.hidden)return;
    if(!last||now-last>=1000/24){time.value+=last?Math.min((now-last)/1000,.25):0;last=now;draw();}
    frame=requestAnimationFrame(tick);
  }
  function schedule(){cancelAnimationFrame(frame);frame=0;last=0;if(!disposed&&visible&&!paused&&!document.hidden)frame=requestAnimationFrame(tick);}
  function resize(){const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);ascii.resize(width,height);draw();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.01,rootMargin:'-72px 0px 0px 0px'});intersection.observe(host);
  document.addEventListener('visibilitychange',schedule);
  const lost=e=>{e.preventDefault();paused=true;schedule();host.dataset.failed='true';};renderer.domElement.addEventListener('webglcontextlost',lost);
  host.kvStats=()=>({draws,visible,paused,time:time.value,camera:camera.position.toArray(),artworks:cards.length,loaded:cards.filter(c=>c.material.map).length,instances:architecture.userData.instances*rooms.length,exchanges,seen:[...seen],items:cards.map(c=>c.userData.item?.id),poolSize:items.length,gpu:{...renderer.info.memory},rooms:stations.map((s,i)=>({index:s.index,visibility:rooms[i].userData.visibility.value})),opacities:cards.map(c=>c.material.opacity)});
  resize();
  return {
    setPaused(value){paused=value||reducedMotion;schedule();},
    dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',schedule);cards.forEach(mesh=>{mesh.material.map?.dispose();mesh.material.dispose();});plane.dispose();architecture.traverse(o=>o.geometry?.dispose());rooms.forEach(room=>room.children.forEach(o=>o.material.dispose()));baseMaterials.forEach(m=>m.dispose());ascii.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();delete host.kvStats;}
  };
}
