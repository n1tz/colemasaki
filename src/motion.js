import * as THREE from 'three';

// Shared world-space field: neighboring cubes respond together, across instances.
const noiseGLSL = /* glsl */`
float hash31(vec3 p) {
  p = fract(p * .1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float fieldNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
                 mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
                 mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fieldFBM(vec3 p) {
  return .57 * fieldNoise(p) + .29 * fieldNoise(p * 2.03 + 9.1)
       + .14 * fieldNoise(p * 4.01 - 7.3);
}
`;

export function createFieldMaterials() {
  const time = { value: 0 };
  const metal = new THREE.MeshStandardMaterial({ color: '#d8d9d1', roughness: .27, metalness: .72, envMapIntensity: .7 });
  metal.onBeforeCompile = shader => {
    shader.uniforms.uFieldTime = time;
    shader.vertexShader = `uniform float uFieldTime;\n${noiseGLSL}\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', /* glsl */`
      #include <begin_vertex>
      vec3 fieldCenter = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
      float drift = fieldFBM(fieldCenter * .22 + vec3(0., -uFieldTime * .15, uFieldTime * .08));
      float wave = .5 + .5 * sin(dot(fieldCenter, vec3(.46, .31, -.26)) - uFieldTime * .9 + drift * 6.0);
      transformed *= mix(.26, 1.82, smoothstep(.08, .93, wave * .72 + drift * .28));
    `);
  };
  metal.customProgramCacheKey = () => 'noise-wave-cubes-v1';

  function wire(opacity) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: { uFieldTime: time, uOpacity: { value: opacity }, uInk: { value: new THREE.Color('#c1c4b6') } },
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
        ${noiseGLSL}
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
  return { time, metal, wire: wire(.72), vacantWire: wire(.28) };
}
