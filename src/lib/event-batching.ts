import * as THREE from 'three';

/** Small spatial batches retain frustum culling on the winding route. */
export function batchInstances(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[], cellSize = 45) {
  const cells = new Map<string, THREE.Matrix4[]>();
  for (const matrix of matrices) {
    const e = matrix.elements, key = `${Math.floor(e[12] / cellSize)},${Math.floor(e[13] / cellSize)},${Math.floor(e[14] / cellSize)}`;
    const cell = cells.get(key) ?? []; cell.push(matrix); cells.set(key, cell);
  }
  const batches: THREE.InstancedMesh[] = [];
  for (const cell of cells.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, cell.length);
    cell.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); mesh.matrixAutoUpdate = false;
    parent.add(mesh); batches.push(mesh);
  }
  return batches;
}

export function disposeObject(root: THREE.Object3D, retained?: { geometries: ReadonlySet<THREE.BufferGeometry>; materials: ReadonlySet<THREE.Material> }) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh instanceof THREE.InstancedMesh) mesh.dispose();
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material));
  });
  materials.forEach(material => {
    if (retained?.materials.has(material)) return;
    Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
    material.dispose();
  });
  textures.forEach(texture => texture.dispose()); geometries.forEach(geometry => { if (!retained?.geometries.has(geometry)) geometry.dispose(); }); root.removeFromParent();
}
