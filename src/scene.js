import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { createFieldMaterials } from './motion.js';

// Each collection occupies a persistent location. Content is independent of geometry.
const locations = [[-4, .5, 0], [6, 2, -3], [1, -3.5, 2.5], [-8, -5, -5], [8, -6, -5]];
export function createSpace(host, collections, { onOpen, onSelect, onReady, onHover, reducedMotion }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#11120f');
  scene.fog = new THREE.FogExp2('#11120f', 0.006);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, .04);
  scene.environment = environmentMap.texture;
  environment.dispose(); pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(43, host.clientWidth / host.clientHeight, .1, 180);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .075;
  controls.enablePan = true;
  controls.minDistance = 6;
  controls.maxDistance = 110;
  controls.maxPolarAngle = Math.PI * .93;
  controls.rotateSpeed = .5;
  controls.zoomSpeed = .65;
  controls.autoRotate = false;
  controls.autoRotateSpeed = .18;
  scene.add(new THREE.AmbientLight(0xffffff, .65));
  const key = new THREE.DirectionalLight(0xffffff, 4.5); key.position.set(-10, 20, 15); scene.add(key);
  const rim = new THREE.DirectionalLight(0xe2e4dd, 2.5); rim.position.set(15, -3, -10); scene.add(rim);

  const boxes = new THREE.BoxGeometry(1, 1, 1);
  const field = createFieldMaterials();
  const { metal, wire: lineMat, vacantWire: vacantMat } = field;
  const noise = new ImprovedNoise();
  const groups = []; const artworks = []; const hitTargets = [];
  const manager = new THREE.LoadingManager(onReady);
  const loader = new THREE.TextureLoader(manager);
  const dummy = new THREE.Object3D();
  function menger(x,y,z,size,depth,points) {
    if (!depth) { points.push([x,y,z,size]); return; }
    const s=size/3;
    for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++) for(let c=-1;c<=1;c++) {
      if ((a===0)+(b===0)+(c===0)<2) continue;
      menger(x+a*s,y+b*s,z+c*s,s,depth-1,points);
    }
  }
  collections.forEach((collection, ci) => {
    const group = new THREE.Group(); group.position.fromArray(locations[ci]); scene.add(group); groups.push(group);
    const populated = collection.items.length > 0;
    const points=[];
    menger(0,0,0,populated ? 10 : 4.8,populated ? 3 : 2,points);
    if (populated) {
      const instanced = new THREE.InstancedMesh(boxes, metal, points.length);
      points.forEach(([x,y,z,s], i) => {
        dummy.position.set(x,y,z); dummy.scale.setScalar(s*.88); dummy.rotation.set(0,0,0); dummy.updateMatrix(); instanced.setMatrixAt(i,dummy.matrix);
        instanced.setColorAt(i,new THREE.Color().setScalar(.38 + ((i*17)%29)/50));
      });
      instanced.instanceMatrix.needsUpdate = true; group.add(instanced);
      // GPU displacement can enlarge the outermost cubes beyond their static bounds.
      instanced.computeBoundingSphere(); instanced.boundingSphere.radius += .5;
    }
    // A second lattice extends beyond the solid volume, following the same recursion.
    const edge = new THREE.EdgesGeometry(boxes);
    const vertices=[]; const edgeArray=edge.attributes.position.array;
    points.forEach(([x,y,z,s],i)=>{
      const spread=populated?1.15:1;
      for(let j=0;j<edgeArray.length;j+=3) vertices.push((edgeArray[j]*s+x)*spread,(edgeArray[j+1]*s+y)*spread,(edgeArray[j+2]*s+z)*spread);
    });
    const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    group.add(new THREE.LineSegments(geometry,populated?lineMat:vacantMat)); edge.dispose();
    const zone = new THREE.Mesh(new THREE.BoxGeometry(6,6,6), new THREE.MeshBasicMaterial({ visible: false }));
    zone.userData={category:ci}; group.add(zone); hitTargets.push(zone);
    // Planes retain the exact source aspect ratio. No cropping, recoloring, or fabricated titles.
    const displayed = collection.id === 'zine' ? [collection.items[0], collection.items[5], collection.items[9], collection.items.at(-1)].filter((item,i,items)=>item&&items.indexOf(item)===i) : collection.items;
    displayed.forEach((item,i)=>{
      const cols = collection.id === 'personal' ? 4 : 2;
      const rows = Math.ceil(displayed.length/cols);
      const width = collection.id === 'personal' ? 2.25 : 2.55;
      const height = width * item.height / item.width;
      const x = (i%cols-(cols-1)/2)*(width+.65);
      const y = (Math.floor(i/cols)-(rows-1)/2)*-3.1 + (i%2 ? .38 : -.25);
      const z = 5.5 + ((i%3)*.6);
      const texture=loader.load(item.thumb, undefined, undefined,()=>{}); texture.colorSpace=THREE.SRGBColorSpace; texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));
      mesh.position.set(x,y,z);
      mesh.rotation.set((i%3-1)*.12, (i%2 ? -.28 : .3), 0);
      mesh.userData={category:ci,item:collection.items.indexOf(item),origin:new THREE.Vector3(x,y,z),phase:0,seed:i*1.71+ci*4.3};
      group.add(mesh); artworks.push(mesh);
    });
  });
  // Thin connective members make the archive read as one continuous object.
  const branches=[];
  locations.forEach((point,i)=>{if(i===0)return; const a=locations[i-1];branches.push(...a,point[0],a[1],a[2],point[0],a[1],a[2],...point);});
  const branchGeometry=new THREE.BufferGeometry(); branchGeometry.setAttribute('position',new THREE.Float32BufferAttribute(branches,3));
  const connections = new THREE.LineSegments(branchGeometry,new THREE.LineBasicMaterial({color:'#717468',transparent:true,opacity:.16}));
  scene.add(connections);
  let active=-1, tween=null, paused=false, frame=0, last=performance.now();
  let motionEnabled = !reducedMotion;
  const homeTarget = new THREE.Vector3(0,-1,0);
  function homePosition(){return host.clientWidth<800 ? new THREE.Vector3(26,18,62) : new THREE.Vector3(15.5,10.5,29.5);}
  camera.position.copy(homePosition());controls.target.copy(homeTarget);controls.update();
  function travel(position,target) {
    tween={start:performance.now(),from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),toTarget:target};
    if(reducedMotion){camera.position.copy(position);controls.target.copy(target);tween=null;controls.update();}
  }
  function select(index){
    active=index;
    connections.visible=index<0;
    groups.forEach((g,i)=>{g.visible=index<0||i===index;});
    if(index<0) travel(homePosition(),homeTarget.clone());
    else {const target=new THREE.Vector3(...locations[index]).add(new THREE.Vector3(0,0,2));
      const distance=host.clientWidth<800 ? 40 : 23;
      travel(target.clone().add(new THREE.Vector3(.8,1.1,distance)),target);
    }
  }
  controls.addEventListener('start',()=>{tween=null;});
  const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let down=null;let hovered=null;
  function intersects(event, objects){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(objects,false)[0];}
  renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  renderer.domElement.addEventListener('pointermove',e=>{
    if(e.buttons)return;
      const hit=intersects(e,artworks.filter(o=>o.parent.visible));hovered=hit?.object;
    renderer.domElement.style.cursor=hovered?'pointer':'grab';
    onHover(hovered?.userData,e.clientX,e.clientY);
  });
  renderer.domElement.addEventListener('pointerleave',()=>onHover(null));
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6){down=null;return;} down=null;
    const hit=intersects(e,artworks.filter(o=>o.parent.visible));
    if(hit){onOpen(hit.object.userData.category,hit.object.userData.item);return;}
    const zone=intersects(e,hitTargets.filter(o=>o.parent.visible));if(zone)onSelect(zone.object.userData.category);
  });
  const labelElements=collections.map((c,i)=>document.querySelector(`[data-marker="${i}"]`));
  const projected=new THREE.Vector3();
  const artWorld=new THREE.Vector3();
  const facingMatrix=new THREE.Matrix4();
  const facingQuaternion=new THREE.Quaternion();
  function animateArt(delta){
    if(motionEnabled) field.time.value+=delta;
    artworks.forEach(mesh=>{
      if(!mesh.parent.visible)return;
      const data=mesh.userData;
      if(motionEnabled && mesh!==hovered && !down){
        data.phase+=delta;
        const angle=data.phase*.038;
        const drift=noise.noise(data.seed,data.phase*.12,3.7);
        // Each work has its own lane; a complete orbit takes roughly three minutes.
        // The hovered work holds still so selecting it never becomes a chase.
        const radius=1+drift*.035;
        mesh.position.set(
          (data.origin.x*Math.cos(angle)+data.origin.z*Math.sin(angle))*radius,
          data.origin.y+noise.noise(data.seed,2.3,data.phase*.15)*.65,
          (-data.origin.x*Math.sin(angle)+data.origin.z*Math.cos(angle))*radius
        );
      }
      // Spherical billboarding settles gently after the camera moves.
      // A paused scene can still be navigated; reduced motion snaps without easing.
      mesh.getWorldPosition(artWorld);
      facingMatrix.lookAt(camera.position,artWorld,camera.up);
      facingQuaternion.setFromRotationMatrix(facingMatrix);
      if(reducedMotion)mesh.quaternion.copy(facingQuaternion);
      else mesh.quaternion.slerp(facingQuaternion,1-Math.exp(-delta*3.8));
    });
  }
  function labels(){
    groups.forEach((g,i)=>{
      const el=labelElements[i];
      if(active!==-1||!collections[i].items.length){el.hidden=true;return;}
      projected.copy(g.position).add(new THREE.Vector3(0,-4,3)).project(camera);
      const x=(projected.x*.5+.5)*host.clientWidth,y=(-projected.y*.5+.5)*host.clientHeight;
      const mobile=host.clientWidth<800;
      el.hidden=projected.z>1||projected.z<0||x<35||x>host.clientWidth-(mobile?35:270)||y<(mobile?300:90)||y>host.clientHeight-130;
      el.style.left=`${x}px`;el.style.top=`${y}px`;
    });
  }
  function tick(now){
    frame=requestAnimationFrame(tick);const delta=Math.min((now-last)/1000,.05);last=now;
    if(paused||document.hidden)return;
    if(tween){const t=Math.min((now-tween.start)/1350,1);const ease=t*t*(3-2*t);camera.position.lerpVectors(tween.from,tween.to,ease);controls.target.lerpVectors(tween.fromTarget,tween.toTarget,ease);if(t===1)tween=null;}
    controls.update(delta);animateArt(delta);labels();renderer.render(scene,camera);
  }
  frame=requestAnimationFrame(tick);
  const resize=new ResizeObserver(()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);if(active===-1)select(-1);});resize.observe(host);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();onReady('The 3D view is unavailable. Use the work index.');});
  return {
    select,
    zoom(factor){tween=null;const offset=camera.position.clone().sub(controls.target).multiplyScalar(factor);offset.clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);controls.update();},
    setPaused(value){paused=value;controls.enabled=!value;},
    setMotion(value){motionEnabled=value&&!reducedMotion;},
    stats(){return {drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,artworks:artworks.length,camera:camera.position.toArray(),target:controls.target.toArray(),motion:{enabled:motionEnabled,time:field.time.value,art:artworks.filter(o=>o.parent.visible).map(o=>({position:o.position.toArray(),quaternion:o.quaternion.toArray(),facing:new THREE.Vector3(0,0,1).applyQuaternion(o.quaternion).dot(camera.position.clone().sub(o.getWorldPosition(new THREE.Vector3())).normalize())}))}};},
    dispose(){cancelAnimationFrame(frame);resize.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{m.map?.dispose();m.dispose();});}});environmentMap.dispose();renderer.dispose();}
  };
}
