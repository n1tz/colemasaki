import * as THREE from 'three';

// Smooth value noise from one hardware-filtered 3D texture fetch.
// The texture holds a random value at every lattice point. Sampling between
// texel centres with a smoothstep-warped fraction reproduces the classic
// hash-and-trilinear-mix value noise exactly, but costs 1 fetch instead of
// 8 hashes and 7 mixes. Half-float storage keeps the gradients free of banding.
const SIZE = 32;
let shared;

export function noiseTexture() {
  if (shared) return shared;
  const data = new Uint16Array(SIZE ** 3);
  for (let i = 0; i < data.length; i++) {
    let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    data[i] = THREE.DataUtils.toHalfFloat((h >>> 0) / 4294967296);
  }
  shared = new THREE.Data3DTexture(data, SIZE, SIZE, SIZE);
  shared.format = THREE.RedFormat; shared.type = THREE.HalfFloatType;
  shared.minFilter = shared.magFilter = THREE.LinearFilter;
  shared.wrapS = shared.wrapT = shared.wrapR = THREE.RepeatWrapping;
  shared.unpackAlignment = 1; shared.needsUpdate = true;
  return shared;
}

// Declares `uNoise3D` and `float vnoise(vec3)`, range 0..1.
export const noiseGLSL = /* glsl */`
uniform highp sampler3D uNoise3D;
float vnoise(vec3 p){
  vec3 i=floor(p),f=fract(p);
  return texture(uNoise3D,(i+f*f*(3.-2.*f)+.5)/${SIZE}.).r;
}
`;
