import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { createFieldMaterials } from './motion.js';
import { createDepthField } from './depth-field.js';
import { exhibitionLayout } from './layout.js';

const desktopLocations = [[-9, 0, 0], [0, 1.2, -1], [9, 0, 0], [-5, -6.5, -4], [5, -6.5, -4]];
const mobileLocations = [[-4, 2.5, 0], [4, 2.5, 0], [0, -5, 0], [-5, -6.5, -4], [5, -6.5, -4]];

export function createSpace(host, collections, { onOpen, onSelect, onReady, onHover, onPage, onProgress, reducedMotion }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#11120f');
  const depthField = createDepthField(); scene.add(depthField);
  scene.fog = new THREE.FogExp2('#11120f', .006);
  // Artwork is rendered last with cleared depth. Neither opaque cubes nor
  // transparent wires can ever cross an image, including during camera travel.
  const artScene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.autoClear = false; renderer.info.autoReset = false;
  host.appendChild(renderer.domElement);
  const environment = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, .04);
  scene.environment = environmentMap.texture; environment.dispose(); pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(43, host.clientWidth / host.clientHeight, .1, 300);
  const layoutFrame = document.querySelector('#exhibition-frame');
  let viewportSignature = '';
  function syncViewport() {
    const rect = layoutFrame.getBoundingClientRect(), hostRect = host.getBoundingClientRect();
    const signature = [rect.left,rect.top,rect.width,rect.height,hostRect.width,hostRect.height].join(',');
    if(signature === viewportSignature)return false;
    viewportSignature=signature;
    camera.setViewOffset(rect.width,rect.height,hostRect.left-rect.left,hostRect.top-rect.top,hostRect.width,hostRect.height);
    renderer.setSize(hostRect.width,hostRect.height);
    return true;
  }
  syncViewport();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .075; controls.enablePan = false;
  controls.minDistance = 6; controls.maxDistance = 110; controls.rotateSpeed = .4; controls.zoomSpeed = .65;
  scene.add(new THREE.AmbientLight(0xffffff, .5));
  const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(-10, 20, 15); scene.add(key);
  const rim = new THREE.DirectionalLight(0xe2e4dd, 1.8); rim.position.set(15, -3, -10); scene.add(rim);
  const boxes = new THREE.BoxGeometry(1, 1, 1), field = createFieldMaterials(), noise = new ImprovedNoise();
  const groups = [], boards = [], artworks = [], hitTargets = [], layouts = [];
  let assetsReady=false, fontsReady=false, ready=false;
  document.fonts.ready.then(()=>{fontsReady=true;});
  const manager = new THREE.LoadingManager(()=>{assetsReady=true;}), loader = new THREE.TextureLoader(manager), dummy = new THREE.Object3D();
  manager.onProgress=(_url,loaded,total)=>onProgress?.(loaded/total*.9);
  let active = -1, page = 0, tween = null, paused = false, frame = 0, last = performance.now();
  let motionEnabled = !reducedMotion, down = null, hovered = null;
  const isMobile = () => innerWidth <= 800;
  const locations = () => isMobile() ? mobileLocations : desktopLocations;
  function fractal(x, y, z, size, depth, points) {
    if (!depth) { points.push([x, y, z, size]); return; }
    const s = size / 3;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      if ((a === 0) + (b === 0) + (c === 0) < 2) continue;
      fractal(x + a * s, y + b * s, z + c * s, s, depth - 1, points);
    }
  }
  collections.forEach((collection, ci) => {
    const group = new THREE.Group(); scene.add(group); groups.push(group);
    const board = new THREE.Group(); artScene.add(board); boards.push(board);
    const populated = collection.items.length > 0, points = [];
    fractal(0, 0, 0, populated ? 10 : 4, populated ? 3 : 2, points);
    if (populated) {
      const instanced = new THREE.InstancedMesh(boxes, field.metal, points.length);
      points.forEach(([x, y, z, s], i) => {
        dummy.position.set(x, y, z); dummy.scale.setScalar(s * .88); dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix); instanced.setColorAt(i, new THREE.Color().setScalar(.38 + ((i * 17) % 29) / 50));
      });
      instanced.instanceMatrix.needsUpdate = true; instanced.computeBoundingSphere(); instanced.boundingSphere.radius += .5; group.add(instanced);
    }
    const edge = new THREE.EdgesGeometry(boxes), vertices = [], edgeArray = edge.attributes.position.array;
    points.forEach(([x, y, z, s]) => {
      const spread = populated ? 1.15 : 1;
      for (let j = 0; j < edgeArray.length; j += 3) vertices.push((edgeArray[j] * s + x) * spread, (edgeArray[j + 1] * s + y) * spread, (edgeArray[j + 2] * s + z) * spread);
    });
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    group.add(new THREE.LineSegments(geometry, populated ? field.wire : field.vacantWire)); edge.dispose();
    const zone = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 7), new THREE.MeshBasicMaterial({ visible: false }));
    zone.userData = { category: ci }; group.add(zone); hitTargets.push(zone);
    collection.items.forEach((item, i) => {
      const texture = loader.load(item.thumb, undefined, undefined, () => {}); texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false, transparent: true }));
      mesh.userData = { category: ci, item: i, origin: new THREE.Vector3(), seed: i * 1.71 + ci * 4.3, phase: 0 };
      board.add(mesh); artworks.push(mesh);
    });
  });
  function arrange() {
    groups.forEach((group, ci) => {
      group.position.fromArray(locations()[ci]);
      group.visible = active < 0 ? !(isMobile() && !collections[ci].items.length) : ci === active;
      group.scale.setScalar(active < 0 ? (isMobile() ? .65 : .86) : .85); boards[ci].visible = group.visible;
      const layout = exhibitionLayout(collections[ci], { overview: active < 0, mobile: isMobile(), aspect: camera.aspect, page }); layouts[ci] = layout;
      boards[ci].children.forEach(mesh => {
        const slot = layout.slots.find(s => s.index === mesh.userData.item); mesh.visible = Boolean(slot); if (!slot) return;
        mesh.userData.origin.set(slot.x, slot.y, 0); mesh.position.copy(mesh.userData.origin); mesh.scale.set(slot.width, slot.height, 1); mesh.userData.baseScale=mesh.scale.clone(); mesh.userData.order=layout.slots.indexOf(slot);
      });
    });
    field.metal.envMapIntensity = active < 0 ? .55 : .22;
    field.metal.color.set(active < 0 ? '#b2b5aa' : '#5d6358');
    field.wire.uniforms.uOpacity.value = active < 0 ? .5 : .1; key.intensity = active < 0 ? 3 : 1.6;
    field.strength.value = active < 0 ? 1 : .12;
    if (active >= 0) { page = layouts[active].page; onPage?.(layouts[active]); } else onPage?.(null);
  }
  function destination() {
    const target = active < 0 ? new THREE.Vector3(0, isMobile() ? -1.3 : -.8, 0) : groups[active].position.clone();
    const layout = active < 0 ? { width: isMobile() ? 15.6 : 28, height: isMobile() ? 15.5 : 12.5 } : layouts[active];
    const tan = Math.tan(THREE.MathUtils.degToRad(43 / 2));
    const distance = 2.3 + Math.max(layout.width / (2 * tan * camera.aspect), (layout.height + (active < 0 ? 0 : .65)) / (2 * tan)) * (active < 0 ? 1 : 1.12);
    return { target, position: target.clone().add(new THREE.Vector3(0, distance * .07, distance)) };
  }
  function travel(instant = false) {
    camera.fov=43;camera.updateProjectionMatrix();
    const { position, target } = destination();
    controls.minAzimuthAngle = active < 0 ? -.26 : -Math.PI; controls.maxAzimuthAngle = active < 0 ? .26 : Math.PI;
    controls.minPolarAngle = active < 0 ? 1.25 : .35; controls.maxPolarAngle = active < 0 ? 1.75 : Math.PI - .35;
    if (instant || reducedMotion) { camera.position.copy(position); controls.target.copy(target); tween = null; controls.enabled=!paused; controls.update(); }
    else { controls.enabled=false; tween = { start: performance.now(), from: camera.position.clone(), to: position, fromTarget: controls.target.clone(), toTarget: target }; }
  }
  function select(index) {
    active = index; page = 0; hovered = null; onHover(null);
    syncViewport();
    arrange(); travel();
  }
  function turnExhibition(direction) { if (active < 0) return; page += direction; arrange(); travel(); }
  arrange(); travel(true);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const visibleArt = () => artworks.filter(o => o.visible && o.parent.visible);
  function intersects(event, objects) {
    const rect = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera); return raycaster.intersectObjects(objects, false)[0];
  }
  renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointermove', e => {
    if (e.buttons || tween) return; hovered = intersects(e, visibleArt())?.object; renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab'; onHover(hovered?.userData, e.clientX, e.clientY);
  });
  renderer.domElement.addEventListener('pointerleave', () => { hovered = null; onHover(null); });
  renderer.domElement.addEventListener('pointercancel', () => { down = null; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (tween) {down=null;return;}
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; } down = null;
    const hit = intersects(e, visibleArt());
    if (hit) { const { category, item } = hit.object.userData; active < 0 ? onSelect(category) : onOpen(category, item); return; }
    const zone = intersects(e, hitTargets.filter(o => o.parent.visible)); if (zone && active < 0) onSelect(zone.object.userData.category);
  });
  const labelElements = collections.map((c, i) => document.querySelector(`[data-marker="${i}"]`));
  const workLabels = document.createElement('div'); workLabels.className = 'work-labels'; workLabels.setAttribute('aria-hidden', 'true'); host.appendChild(workLabels);
  const itemLabels = artworks.map(mesh => { const el = document.createElement('span'); el.className = 'work-label'; el.textContent = `${collections[mesh.userData.category].id === 'zine' ? 'PAGE ' : ''}${String(mesh.userData.item + 1).padStart(2, '0')}`; workLabels.appendChild(el); return el; });
  const projected = new THREE.Vector3(), direction = new THREE.Vector3();
  function animateArt(delta) {
    if (motionEnabled) field.time.value += delta;
    const progress=tween?Math.min((performance.now()-tween.start)/1450,1):1;
    const pulse=Math.sin(progress*Math.PI);
    groups.forEach(group=>{
      const base=active<0?(isMobile()?.65:.86):.85;
      group.scale.setScalar(base*(1+pulse*.28));
      group.rotation.set(pulse*.16,pulse*.65,pulse*-.12);
    });
    boards.forEach((board, ci) => {
      if (!board.visible) return;
      direction.copy(camera.position).sub(groups[ci].position).normalize(); board.position.copy(groups[ci].position).addScaledVector(direction, 2.3);
      // One facing plane per collection keeps ordered slots from crossing.
      board.quaternion.copy(camera.quaternion);
      board.children.forEach(mesh => {
        if (!mesh.visible) return; const data = mesh.userData;
        const reveal=tween?THREE.MathUtils.smoothstep(progress,.18+data.order*.018,.66+data.order*.018):1;
        mesh.scale.copy(data.baseScale);mesh.scale.x*=.82+.18*reveal;mesh.scale.y*=.025+.975*reveal;
        mesh.material.opacity=reveal;
        mesh.rotation.y=(1-reveal)*.7;
        if (motionEnabled && mesh !== hovered && !down) {
          data.phase += delta; const amplitude = active < 0 ? .045 : .018;
          mesh.position.set(data.origin.x + noise.noise(data.seed, data.phase * .12, 3.7) * amplitude, data.origin.y + noise.noise(data.seed, 2.3, data.phase * .12) * amplitude, 0);
        }
      });
    });
  }
  function labels() {
    const rect = host.getBoundingClientRect();
    workLabels.hidden = active < 0 || Boolean(tween);
    if(active >= 0) artworks.forEach((mesh,i)=>{
      const el=itemLabels[i]; el.hidden=!mesh.visible||!mesh.parent.visible; if(el.hidden)return;
      projected.set(-.5,-.5,0).applyMatrix4(mesh.matrixWorld).project(camera);
      el.style.left=`${(projected.x*.5+.5)*rect.width}px`;el.style.top=`${(-projected.y*.5+.5)*rect.height+7}px`;
    });
    groups.forEach((g, i) => {
      const el = labelElements[i]; if (tween || active !== -1 || !collections[i].items.length) { el.hidden = true; return; }
      projected.set(0, -layouts[i].height / 2 - .65, 0).applyQuaternion(boards[i].quaternion).add(boards[i].position).project(camera);
      const x = (projected.x * .5 + .5) * rect.width, y = (-projected.y * .5 + .5) * rect.height;
      el.hidden = projected.z > 1 || x < 0 || x > rect.width || y < 0 || y > rect.height;
      el.style.left = `${rect.left + x}px`; el.style.top = `${rect.top + y}px`;
    });
  }
  function tick(now) {
    frame = requestAnimationFrame(tick); const delta = Math.min((now - last) / 1000, .05); last = now; if (paused || document.hidden) return;
    if (tween) {
      const t=Math.min((now-tween.start)/1450,1), ease=t*t*t*(t*(t*6-15)+10), arc=Math.sin(Math.PI*t);
      camera.position.lerpVectors(tween.from,tween.to,ease);
      camera.position.x+=arc*(tween.toTarget.x>=tween.fromTarget.x?1:-1)*4;
      camera.position.y+=arc*2.8;camera.position.z+=arc*7;
      controls.target.lerpVectors(tween.fromTarget,tween.toTarget,ease);
      camera.fov=43+arc*7;camera.updateProjectionMatrix();
      if(t===1){tween=null;controls.enabled=!paused;}
    }
    controls.update(delta); animateArt(delta); renderer.info.reset(); renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(artScene, camera); labels();
    if(!ready&&assetsReady&&fontsReady){ready=true;onProgress?.(1);onReady();}
  }
  frame = requestAnimationFrame(tick);
  const resize = new ResizeObserver(() => { if(syncViewport()){arrange(); travel(true);} }); resize.observe(host);resize.observe(layoutFrame);
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); onReady('The 3D view is unavailable. Use the work index.'); });
  function artworkStats(o) {
    const rect = host.getBoundingClientRect();
    const corners = [[-.5, -.5], [.5, .5]].map(([x, y]) => new THREE.Vector3(x, y, 0).applyMatrix4(o.matrixWorld).project(camera));
    return { category: o.userData.category, item: o.userData.item, position: o.position.toArray(), facing: Math.abs(o.parent.quaternion.dot(camera.quaternion)),
      rect: { left: rect.left + (corners[0].x + 1) * rect.width / 2, right: rect.left + (corners[1].x + 1) * rect.width / 2, top: rect.top + (1 - corners[1].y) * rect.height / 2, bottom: rect.top + (1 - corners[0].y) * rect.height / 2 } };
  }
  return {
    select, turnExhibition,
    zoom(factor) { tween = null; controls.enabled=!paused;camera.fov=43;camera.updateProjectionMatrix(); const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor); offset.clampLength(controls.minDistance, controls.maxDistance); camera.position.copy(controls.target).add(offset); controls.update(); },
    setPaused(value) { paused = value; controls.enabled = !value && !tween; }, setMotion(value) { motionEnabled = value && !reducedMotion; },
    stats() { const rect = layoutFrame.getBoundingClientRect(); return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, artworks: visibleArt().length, camera: camera.position.toArray(), target: controls.target.toArray(), active, page, transitioning:Boolean(tween), backgroundInstances:depthField.userData.instances, canvas:{width:host.clientWidth,height:host.clientHeight},
      viewport: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, artworkPass: 'after-geometry-clear-depth', motion: { enabled: motionEnabled, time: field.time.value, art: visibleArt().map(artworkStats) } }; },
    dispose() { cancelAnimationFrame(frame); resize.disconnect(); controls.dispose(); [scene, artScene].forEach(s => s.traverse(o => { o.geometry?.dispose(); if (o.material) { const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => { m.map?.dispose(); m.dispose(); }); } })); environmentMap.dispose(); renderer.dispose(); }
  };
}
