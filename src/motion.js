import * as THREE from 'three';
import { noiseTexture, noiseGLSL } from './noise-texture.js';

// Shared world-space field: neighboring cubes respond together, across instances.
// Each octave is a single 3D-texture fetch (see noise-texture.js).
const fieldGLSL = /* glsl */`
${noiseGLSL}
float fieldFBM(vec3 p) {
  return .57 * vnoise(p) + .29 * vnoise(p * 2.03 + 9.1) + .14 * vnoise(p * 4.01 - 7.3);
}
`;

// The sculptures used to run full PBR (metal, environment map, three lights)
// per fragment. That look is now baked once into a matcap (see
// scripts/bake-sculpture-matcap.mjs): one texture fetch per fragment.
export function bakeFaceShading(geometry) {
  const normal = geometry.attributes.normal, colors = [];
  for (let i = 0; i < normal.count; i++) {
    const light = .36 + Math.max(0, normal.getY(i)) * .5 + Math.abs(normal.getZ(i)) * .23;
    colors.push(light, light, light);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

export function createFieldMaterials({ manager } = {}) {
  const time = { value: 0 };
  const noise = { value: noiseTexture() };
  const matcap = new THREE.TextureLoader(manager).load('/textures/sculpture-matcap.png');
  matcap.colorSpace = THREE.SRGBColorSpace;
  const metal = new THREE.MeshMatcapMaterial({ matcap });
  metal.onBeforeCompile = shader => {
    shader.uniforms.uFieldTime = time;
    shader.uniforms.uNoise3D = noise;
    shader.vertexShader = `uniform float uFieldTime;\n${fieldGLSL}\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', /* glsl */`
      #include <begin_vertex>
      vec3 fieldCenter = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
      float drift = fieldFBM(fieldCenter * .22 + vec3(0., -uFieldTime * .15, uFieldTime * .08));
      float wave = .5 + .5 * sin(dot(fieldCenter, vec3(.46, .31, -.26)) - uFieldTime * .9 + drift * 6.0);
      transformed *= mix(.26, 1.82, smoothstep(.08, .93, wave * .72 + drift * .28));
    `);
  };
  metal.customProgramCacheKey = () => 'noise-wave-cubes-v3';

  function wire(opacity) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: { uFieldTime: time, uNoise3D: noise, uOpacity: { value: opacity }, uInk: { value: new THREE.Color('#c1c4b6') } },
      vertexShader: /* glsl */`
        varying vec3 vFieldPosition;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vFieldPosition = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uFieldTime;
        uniform float uOpacity;
        uniform vec3 uInk;
        varying vec3 vFieldPosition;
        ${fieldGLSL}
        void main() {
          vec3 drift = vec3(uFieldTime * .21, -uFieldTime * .16, uFieldTime * .11);
          float field = fieldFBM(vFieldPosition * .72 + drift);
          float mask = smoothstep(.43, .65, field);
          float alpha = mask * uOpacity;
          if (alpha < .015) discard;
          gl_FragColor = vec4(uInk, alpha);
          #include <colorspace_fragment>
        }
      `,
    });
  }
  return { time, metal, wire: wire(.1), vacantWire: wire(.28) };
}
