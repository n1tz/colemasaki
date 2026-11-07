// Bakes public/textures/sculpture-matcap.png: the sculpture's former PBR look
// (metal + RoomEnvironment + key/rim/ambient lights, output x .12) rendered once
// on a sphere viewed down -Z, as in the room views. At runtime the sculptures
// shade with one matcap fetch instead of per-pixel PBR (see motion.js).
// Needs the dev server for Three.js: `npm run dev -- --port 3012`, then
// `node scripts/bake-sculpture-matcap.mjs [out.png]` (REVIEW_URL / CHROME_PATH honoured).
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', m => console.log('page:', m.text())); page.on('pageerror', e => console.log('err', e.message));
await page.route(/RoomEnvironment\.js/, async route => { const res = await route.fetch(); route.fulfill({ response: res, body: (await res.text()).replace(/from ['"]three['"]/g, "from '/node_modules/three/build/three.module.js'") }); });
await page.goto(process.env.REVIEW_URL || 'http://localhost:3012/');
const url = await page.evaluate(async () => {
  const THREE = await import('/node_modules/three/build/three.module.js');
  const { RoomEnvironment } = await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
  const size = 256, canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0, 0, 0);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.AmbientLight(0xffffff, .5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-10, 20, 15); scene.add(key);
  const rim = new THREE.DirectionalLight(0xe2e4dd, 1.8); rim.position.set(15, -3, -10); scene.add(rim);
  const metal = new THREE.MeshStandardMaterial({ color: '#5d6358', roughness: .27, metalness: .72, envMapIntensity: .22 });
  metal.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight *= .12;\n#include <opaque_fragment>'); };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), metal));
  const camera = new THREE.OrthographicCamera(-.97, .97, .97, -.97, .1, 10); camera.position.set(0, 0, 5);
  renderer.render(scene, camera);
  return canvas.toDataURL('image/png');
});
await writeFile(process.argv[2] || 'public/textures/sculpture-matcap.png', Buffer.from(url.split(',')[1], 'base64'));
await browser.close();
