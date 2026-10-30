import * as THREE from 'three';

// Desktop key visual: the Demon Knight bust, one draw call. A rough, drifting
// noise field splits the surface into wireframe, ASCII, heatmap and opaque
// bands with a bright seam along each boundary. All modes live in a single
// fragment shader, so the cost is one small mesh and no extra render passes.
// Sits inside its own colonnade chamber (see depth-field origins in scene.js).
export const HERO_ORIGIN = new THREE.Vector3(0, 0, 120);
// Head bone midpoint, in the baked model's own space (scripts/export-knight.py).
const HEAD = new THREE.Vector3(-.18, 8.55, .8);

const noiseGLSL = /* glsl */`
float h31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float vnoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;

function glyphAtlas() {
  const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 32;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 320, 32);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [...' .:-=+*#%@'].forEach((c, i) => ctx.fillText(c, i * 32 + 16, 17));
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = texture.magFilter = THREE.NearestFilter; texture.generateMipmaps = false;
  return texture;
}

async function loadKnight(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`knight ${response.status}`);
  const buffer = await response.arrayBuffer();
  const [vertexCount, triangleCount] = new Uint32Array(buffer, 0, 2);
  const bounds = new Float32Array(buffer, 8, 6);
  const quantized = new Uint16Array(buffer, 32, vertexCount * 3);
  const indices = new Uint16Array(buffer, 32 + vertexCount * 6, triangleCount * 3);
  // De-indexed so every triangle carries its own barycentrics for the wireframe.
  const position = new Float32Array(triangleCount * 9), bary = new Uint8Array(triangleCount * 9);
  for (let t = 0; t < triangleCount; t++) for (let k = 0; k < 3; k++) {
    const v = indices[t * 3 + k], o = (t * 3 + k) * 3;
    for (let a = 0; a < 3; a++) position[o + a] = bounds[a] + quantized[v * 3 + a] / 65535 * (bounds[a + 3] - bounds[a]) - HEAD.getComponent(a);
    bary[o + k] = 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aBary', new THREE.BufferAttribute(bary, 3, true));
  geometry.computeBoundingSphere();
  return geometry;
}

export function createHero({ manager, url = '/models/knight.bin' }) {
  const group = new THREE.Group(); group.position.copy(HERO_ORIGIN);
  const uniforms = {
    uTime: { value: 0 }, uDissolve: { value: 0 }, uPixel: { value: 1 },
    uGlyphs: { value: glyphAtlas() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: /* glsl */`
      attribute vec3 aBary;
      varying vec3 vBary, vLocal, vWorld;
      void main(){
        vBary=aBary; vLocal=position;
        vec4 world=modelMatrix*vec4(position,1.); vWorld=world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime,uDissolve,uPixel; uniform sampler2D uGlyphs;
      varying vec3 vBary,vLocal,vWorld;
      ${noiseGLSL}
      vec3 thermal(float t){
        t=clamp(t,0.,1.);
        vec3 c=mix(vec3(.02,.01,.08),vec3(.18,.02,.42),smoothstep(0.,.22,t));
        c=mix(c,vec3(.82,.05,.3),smoothstep(.2,.45,t));
        c=mix(c,vec3(1.,.42,.02),smoothstep(.42,.68,t));
        c=mix(c,vec3(1.,.9,.3),smoothstep(.66,.86,t));
        return mix(c,vec3(1.),smoothstep(.86,1.,t));
      }
      void main(){
        vec3 n=normalize(cross(dFdx(vWorld),dFdy(vWorld)));
        vec3 view=normalize(cameraPosition-vWorld);
        if(dot(n,view)<0.)n=-n;
        float diffuse=max(dot(n,normalize(vec3(-.5,.8,.6))),0.);
        float rim=pow(1.-max(dot(n,view),0.),2.5);
        float light=.16+diffuse*.7+rim*.55;

        // Rough, wavy band field anchored to the model so the bands wash over it.
        vec3 p=vLocal*.42+vec3(0.,-uTime*.11,uTime*.04);
        float field=vnoise(p)*.6+vnoise(p*2.1+7.3)*.28+vnoise(vLocal*7.+uTime*.4)*.12;
        field+=.16*sin(vLocal.y*1.3+vLocal.x*.7-uTime*.35);
        float bands=fract(field*.95+uTime*.03)*4.;
        float mode=floor(bands),edge=min(fract(bands),1.-fract(bands));

        // Scroll dissolve: the same field eats the figure away from its edges.
        float cut=field*.8+vnoise(vLocal*3.1)*.2;
        if(cut<uDissolve*1.15-.08)discard;
        float burn=1.-smoothstep(0.,.06,cut-(uDissolve*1.15-.08));

        vec3 color;
        if(mode<.5){
          vec3 w=fwidth(vBary);vec3 a=smoothstep(vec3(0.),w*1.4,vBary);
          float wire=1.-min(min(a.x,a.y),a.z);
          if(wire<.35&&burn<.5)discard;
          color=mix(vec3(.55,.56,.5),vec3(.95,.94,.88),light)*wire*(gl_FrontFacing?1.:.35);
        }else if(mode<1.5){
          vec2 cell=vec2(9.,14.)*uPixel;
          vec2 local=fract(gl_FragCoord.xy/cell);
          float level=floor(clamp(light*1.45+.08,0.,.999)*10.);
          float glyph=texture2D(uGlyphs,vec2((level+local.x)/10.,1.-local.y)).r;
          color=mix(vec3(.035,.037,.032),vec3(.86,.85,.78)*(.45+light*.6),glyph);
        }else if(mode<2.5){
          color=thermal(light*.95+rim*.25+.08*sin(vLocal.y*9.-uTime*2.));
        }else{
          float spec=pow(max(dot(n,normalize(view+normalize(vec3(-.5,.8,.6)))),0.),24.);
          color=vec3(.5,.5,.48)*(.3+diffuse*1.1)+vec3(.9,.9,.85)*(rim*.35+spec*.45);
        }
        float seam=1.-smoothstep(0.,.07,edge);
        color=mix(color,vec3(1.,.97,.9),seam*.85);
        color=mix(color,vec3(1.,.5,.2),burn);
        // Lightweight CRT: scanlines, RGB aperture mask, a rolling band and flicker,
        // all from gl_FragCoord, so it costs no extra pass.
        vec2 px=gl_FragCoord.xy/uPixel;
        float scan=.72+.28*sin(px.y*2.094);
        vec3 mask=vec3(.78);mask[int(mod(px.x,3.))]=1.18;
        float roll=smoothstep(.0,.04,.04-abs(fract(px.y/900.-uTime*.09)-.5))*.25;
        float grain=h31(vec3(px,floor(uTime*24.)))*.12;
        color=color*scan*mask*(.94+.06*sin(uTime*53.))+roll+grain*(.4+dot(color,vec3(.33)));
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`,
  });
  material.extensions = { derivatives: true };
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.frustumCulled = false; group.add(mesh);
  let ready = false;
  manager?.itemStart(url);
  loadKnight(url).then(geometry => { mesh.geometry.dispose(); mesh.geometry = geometry; ready = true; })
    .catch(error => { console.warn('Hero model unavailable:', error); manager?.itemError(url); })
    .finally(() => manager?.itemEnd(url));
  return {
    group, uniforms,
    get ready() { return ready; },
    dispose() { mesh.geometry.dispose(); material.dispose(); uniforms.uGlyphs.value.dispose(); },
  };
}
