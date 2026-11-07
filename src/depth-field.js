import * as THREE from 'three';
import { bakeFaceShading } from './motion.js';

export const roomLocations = [[-82, 16, -110], [90, -20, -190], [0, 65, -290], [-150, -55, -350], [160, 80, -420], [-70, 125, -490], [110, -95, -550], [-180, 40, -610]];

// Exponential-squared fog leaves a fraction exp(-(density·d)²) of an object's
// contrast. Past the distance where that falls below `residual`, the object is
// indistinguishable from the background even after the ASCII pass, so it is
// not drawn. Masonry keeps up to 1% of its contrast; the 3.5%-opacity wires
// are culled once their remaining contrast is equally invisible.
export const fogCutoff = (density, residual) => Math.sqrt(-Math.log(residual)) / density;

// A continuous architecture: ten chambers, open ribs, recursively split masonry.
// Each chamber is split into spatially compact chunks (three ring bands, four
// branch quadrants). Chunks share one geometry and one shader program; each has
// a tight bounding sphere so the renderer frustum-culls it, and update() drops
// chunks beyond the fog. Only the nearby part of the field reaches the GPU.
export function createDepthField(time, origins = [[0,0,0], ...roomLocations], { fogDensity = .0035 } = {}) {
  const group = new THREE.Group(), chunks = [];
  const cube = bakeFaceShading(new THREE.BoxGeometry(1, 1, 1)), edge = new THREE.EdgesGeometry(cube);
  const source = edge.attributes.position.array;
  const material=new THREE.MeshBasicMaterial({color:'#363936',vertexColors:true});
  const pulseGLSL=`
    uniform float uArchitectureTime;
    vec3 breathe(vec3 center,vec3 offset){
      float wave=sin(center.z*.09+center.x*.035-uArchitectureTime*.62);
      float undertow=sin(center.y*.12+center.z*.023+uArchitectureTime*.37);
      return center+offset*vec3(1.+wave*.11,1.+undertow*.11,1.+wave*.32+undertow*.12);
    }
  `;
  material.onBeforeCompile=shader=>{
    shader.uniforms.uArchitectureTime=time;
    shader.vertexShader=pulseGLSL+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 center=instanceMatrix[3].xyz;
      vec3 expanded=breathe(center,transformed);
      transformed=expanded-center;
    `);
  };
  material.customProgramCacheKey=()=> 'breathing-architecture';
  const wire=new THREE.LineBasicMaterial({color:'#a3aaa0',transparent:true,opacity:.035,depthWrite:false});
  wire.onBeforeCompile=shader=>{
    shader.uniforms.uArchitectureTime=time;
    shader.vertexShader='attribute vec3 aCenter;\n'+pulseGLSL+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=breathe(aCenter,position-aCenter);');
  };
  wire.customProgramCacheKey=()=> 'breathing-architecture-wire';

  // Every other block carries an outline. The parity runs across the whole
  // field, in generation order, exactly as when the field was one mesh.
  let serial = 0, total = 0;
  const dummy = new THREE.Object3D(), shade = new THREE.Color();
  function chunk(cells) {
    const mesh = new THREE.InstancedMesh(cube, material, cells.length), lines = [], centers = [];
    cells.forEach(([x,y,z,w,h,d,s],i)=>{
      dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,shade.setScalar(s));
      if((serial++)%2)return;
      for(let j=0;j<source.length;j+=3){lines.push(x+source[j]*w*1.08,y+source[j+1]*h*1.08,z+source[j+2]*d*1.08);centers.push(x,y,z);}
    });
    // Breathing scales blocks by at most 1.44 around their centres; pad for it.
    mesh.computeBoundingSphere();mesh.boundingSphere.radius+=4;group.add(mesh);
    const entry = { mesh, sphere: mesh.boundingSphere, outline: null };
    if (lines.length) {
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
      geometry.setAttribute('aCenter',new THREE.Float32BufferAttribute(centers,3));
      geometry.computeBoundingSphere();geometry.boundingSphere.radius+=4;
      entry.outline = new THREE.LineSegments(geometry,wire); group.add(entry.outline);
    }
    total += cells.length; chunks.push(entry);
  }
  function branch(cells,x,y,z,size,depth) {
    if(!depth){cells.push([x,y,z,size*.76,size*.76,size*.76,.35]);return;}
    const s=size/3;
    for(const [a,b,c] of [[0,0,0],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]])branch(cells,x+a*s,y+b*s,z+c*s,s,depth-1);
  }
  origins.forEach(([cx,cy,cz],room)=>{
    // Rotating rectangular colonnades surround an empty gallery aperture.
    for(let band=0;band<3;band++){
      const cells=[];
      for(let ring=band*5;ring<band*5+5;ring++){
        const z=cz+36-ring*9, radius=22+Math.sin(ring*.55+room)*3;
        const angle=(room===2?Math.PI/4:0)+Math.sin(ring*.25+room)*.12;
        for(let side=0;side<4;side++)for(let n=-5;n<=5;n++){
          let x=side%2?radius* (side===1?1:-1):n*radius/5;
          let y=side%2?n*radius/5:radius*(side===0?1:-1);
          const rx=x*Math.cos(angle)-y*Math.sin(angle),ry=x*Math.sin(angle)+y*Math.cos(angle);
          const size=1.1+((n+ring+12)%3)*.45;
          cells.push([cx+rx,cy+ry,z,size,size,3.3,.4+ring%3*.12]);
        }
      }
      chunk(cells);
    }
    for(let quadrant=0;quadrant<4;quadrant++){
      const cells=[];
      for(let i=quadrant*3;i<quadrant*3+3;i++){
        const a=i*Math.PI/6+room*.3;
        branch(cells,cx+Math.cos(a)*36,cy+Math.sin(a)*36,cz-25-(i%4)*18,17,2);
      }
      chunk(cells);
    }
  });
  edge.dispose();
  const meshCutoff = fogCutoff(fogDensity, .01), wireCutoff = fogCutoff(fogDensity, .03);
  group.userData.instances = total;
  group.userData.chunks = chunks.length;
  // Distance culling; frustum culling is left to the renderer.
  group.userData.update = cameraPosition => {
    let drawn = 0;
    for (const { mesh, sphere, outline } of chunks) {
      const reach = cameraPosition.distanceTo(sphere.center) - sphere.radius;
      mesh.visible = reach < meshCutoff; if (mesh.visible) drawn++;
      if (outline) outline.visible = reach < wireCutoff;
    }
    return drawn;
  };
  return group;
}
