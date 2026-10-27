import * as THREE from 'three';

export const roomLocations = [[-82, 16, -110], [90, -20, -190], [0, 65, -290], [-150, -55, -350], [160, 80, -420], [-70, 125, -490], [110, -95, -550], [-180, 40, -610]];

// A continuous architecture: six chambers, open ribs, recursively split masonry.
// All masonry is instanced; all outlines are merged into one draw call.
export function createDepthField(time, origins = [[0,0,0], ...roomLocations]) {
  const group = new THREE.Group(), cells = [], lines = [], centers = [];
  const cube = new THREE.BoxGeometry(1, 1, 1), edge = new THREE.EdgesGeometry(cube);
  const source = edge.attributes.position.array;
  function block(x,y,z,w,h,d,shade=.5) { cells.push([x,y,z,w,h,d,shade]); }
  function branch(x,y,z,size,depth) {
    if(!depth){block(x,y,z,size*.76,size*.76,size*.76,.35);return;}
    const s=size/3;
    for(const [a,b,c] of [[0,0,0],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]])branch(x+a*s,y+b*s,z+c*s,s,depth-1);
  }
  origins.forEach(([cx,cy,cz],room)=>{
    // Rotating rectangular colonnades surround an empty gallery aperture.
    for(let ring=0;ring<15;ring++){
      const z=cz+36-ring*9, radius=22+Math.sin(ring*.55+room)*3;
      const angle=(room===2?Math.PI/4:0)+Math.sin(ring*.25+room)*.12;
      for(let side=0;side<4;side++)for(let n=-5;n<=5;n++){
        let x=side%2?radius* (side===1?1:-1):n*radius/5;
        let y=side%2?n*radius/5:radius*(side===0?1:-1);
        const rx=x*Math.cos(angle)-y*Math.sin(angle),ry=x*Math.sin(angle)+y*Math.cos(angle);
        const size=1.1+((n+ring+12)%3)*.45;
        block(cx+rx,cy+ry,z,size,size,3.3,.4+ring%3*.12);
      }
    }
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6+room*.3;
      branch(cx+Math.cos(a)*36,cy+Math.sin(a)*36,cz-25-(i%4)*18,17,2);
    }
  });
  // Baked face shading keeps the distant architecture cheap: no per-pixel lighting.
  const faceColors=[];
  for(let i=0;i<cube.attributes.normal.count;i++){
    const normal=cube.attributes.normal;
    const light=.36+Math.max(0,normal.getY(i))*.5+Math.abs(normal.getZ(i))*.23;
    faceColors.push(light,light,light);
  }
  cube.setAttribute('color',new THREE.Float32BufferAttribute(faceColors,3));
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
  const mesh=new THREE.InstancedMesh(cube,material,cells.length),dummy=new THREE.Object3D();
  cells.forEach(([x,y,z,w,h,d,shade],i)=>{
    dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    mesh.setColorAt(i,new THREE.Color().setScalar(shade));
    if(i%2)return;
    for(let j=0;j<source.length;j+=3){lines.push(x+source[j]*w*1.08,y+source[j+1]*h*1.08,z+source[j+2]*d*1.08);centers.push(x,y,z);}
  });
  mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
  geometry.setAttribute('aCenter',new THREE.Float32BufferAttribute(centers,3));
  const wire=new THREE.LineBasicMaterial({color:'#a3aaa0',transparent:true,opacity:.035,depthWrite:false});
  wire.onBeforeCompile=shader=>{
    shader.uniforms.uArchitectureTime=time;
    shader.vertexShader='attribute vec3 aCenter;\n'+pulseGLSL+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=breathe(aCenter,position-aCenter);');
  };
  wire.customProgramCacheKey=()=> 'breathing-architecture-wire';
  mesh.computeBoundingSphere();mesh.boundingSphere.radius+=4;
  geometry.computeBoundingSphere();geometry.boundingSphere.radius+=4;
  group.add(new THREE.LineSegments(geometry,wire));
  edge.dispose();group.userData.instances=cells.length;
  return group;
}
