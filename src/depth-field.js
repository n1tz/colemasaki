import * as THREE from 'three';

// A deep, finite field reads as continuous space through perspective and fog.
// All repeated cubes share one draw call; all fine edges share a second one.
export function createDepthField() {
  const group = new THREE.Group();
  const cells = [];
  function branch(x, y, z, size, depth) {
    if (!depth) { cells.push([x, y, z, size]); return; }
    const s = size / 3;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      if ((a === 0) + (b === 0) + (c === 0) < 2) continue;
      branch(x + a * s, y + b * s, z + c * s, s, depth - 1);
    }
  }
  const layers = [
    { z: -22, step: 18, size: 15, rows: 4, columns: 5 },
    { z: -61, step: 28, size: 24, rows: 4, columns: 6 },
    { z: -112, step: 44, size: 38, rows: 4, columns: 5 },
  ];
  layers.forEach((layer, n) => {
    for (let y = 0; y < layer.rows; y++) for (let x = 0; x < layer.columns; x++) {
      branch((x - (layer.columns - 1) / 2) * layer.step + (n % 2 ? 5 : 0),
        (y - 1.5) * layer.step + 8, layer.z - (x % 2) * 3, layer.size, 2);
    }
  });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: '#32352e', fog: true });
  const mesh = new THREE.InstancedMesh(cube, material, cells.length);
  const dummy = new THREE.Object3D();
  const edge = new THREE.EdgesGeometry(cube), source = edge.attributes.position.array, lines = [];
  cells.forEach(([x, y, z, size], i) => {
    dummy.position.set(x, y, z); dummy.scale.setScalar(size * .68); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, new THREE.Color().setScalar(.55 + (i % 7) * .06));
    // The sparser wire envelope leaves quiet gaps rather than a background grid.
    if (i % 3) return;
    for (let j = 0; j < source.length; j += 3) lines.push(x + source[j] * size, y + source[j + 1] * size, z + source[j + 2] * size);
  });
  mesh.instanceMatrix.needsUpdate = true; group.add(mesh);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#656b5d', opacity: .12, transparent: true, depthWrite: false, fog: true })));
  edge.dispose();
  group.userData.instances = cells.length;
  return group;
}
