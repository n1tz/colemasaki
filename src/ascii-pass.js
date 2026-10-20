import * as THREE from 'three';

// The live 3D image supplies luminance to a fixed-width glyph atlas.
// One fullscreen draw; artwork is composited afterwards, untouched.
export function createAsciiPass(renderer) {
  const atlas=document.createElement('canvas');atlas.width=256;atlas.height=32;
  const ctx=atlas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,256,32);
  ctx.fillStyle='#fff';ctx.font='bold 24px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  [...' .:-+*#@'].forEach((char,i)=>ctx.fillText(char,i*32+16,16));
  const glyphs=new THREE.CanvasTexture(atlas);glyphs.minFilter=THREE.LinearFilter;glyphs.generateMipmaps=false;
  const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});target.texture.colorSpace=THREE.SRGBColorSpace;
  const uniforms={image:{value:target.texture},glyphs:{value:glyphs},resolution:{value:new THREE.Vector2()},time:{value:0},travel:{value:0},enabled:{value:1}};
  const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader:`
      uniform sampler2D image,glyphs;
      uniform vec2 resolution;
      uniform float time,travel,enabled;
      varying vec2 vUv;
      void main(){
        vec3 original=texture2D(image,vUv).rgb;
        vec2 grid=resolution/vec2(10.,14.);
        vec2 cell=floor(vUv*grid),local=fract(vUv*grid);
        vec3 sampled=texture2D(image,(cell+.5)/grid).rgb;
        float luminance=dot(sampled,vec3(.2126,.7152,.0722));
        float density=clamp(sqrt(max(luminance-.006,0.))*7.5,0.,1.);
        float index=floor(density*7.);
        float glyph=texture2D(glyphs,vec2((index+local.x)/8.,local.y)).r;
        vec3 ink=mix(vec3(.0056,.006,.0048),vec3(mix(.065,.46,travel))*(.45+density*.55),glyph);
        // One complete horizontal cycle keeps half of every row in ASCII.
        // A slow diagonal drift and gentle curvature move the boundary continuously.
        float phase=vUv.x+vUv.y*.28+time*.018
          +.055*sin(vUv.y*6.283185-time*.13);
        float mask=smoothstep(-.12,.12,sin(phase*6.283185));
        float idle=mask*.94;
        float amount=enabled*max(idle,travel);
        gl_FragColor=vec4(mix(original,ink,amount),1.);
        #include <colorspace_fragment>
      }`});
  const scene=new THREE.Scene(),camera=new THREE.Camera();
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(quad);
  return {
    resize(width,height){target.setSize(Math.round(width*renderer.getPixelRatio()),Math.round(height*renderer.getPixelRatio()));uniforms.resolution.value.set(width,height);},
    render(world,view,time,travel,enabled){
      uniforms.time.value=time;uniforms.travel.value=travel;uniforms.enabled.value=enabled?1:0;
      renderer.setRenderTarget(target);renderer.clear();renderer.render(world,view);
      renderer.setRenderTarget(null);renderer.clear();renderer.render(scene,camera);
    },
    dispose(){target.dispose();glyphs.dispose();quad.geometry.dispose();material.dispose();}
  };
}
