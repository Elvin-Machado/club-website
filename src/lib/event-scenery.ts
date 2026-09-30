import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD } from './event-navigation.ts';
import { LOGO_SCALE, LOGO_CENTER_Y, LOGO_DEPTH, sampleTrack, type CoasterTrack } from './event-coaster.ts';
import { CITY_BLOCKS, BUILDING_BOUNDS, logoClearance, type StationPlacement } from './event-layout.ts';
import { batchInstances, disposeObject } from './event-batching.ts';
import type { QualityLevel } from './event-quality.ts';
import { createTrackSupports } from './event-supports.ts';

const MINT = '#c3e5c8';
function shape(outline: number[][], holes: number[][][] = []) {
  const result = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  result.holes = holes.map(hole => new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))));
  return result;
}

/** One opaque surface. The old coplanar scanline overlay caused the white bands. */
export function createVerticalLogo() {
  const pieces = WORLD.walls.map(wall => new THREE.ExtrudeGeometry(shape(wall.outline, wall.holes), { depth: LOGO_DEPTH, steps: 1, bevelEnabled: false }));
  const geometry = mergeGeometries(pieces)!; pieces.forEach(piece => piece.dispose());
  const material = new THREE.MeshStandardMaterial({ color: '#79a787', metalness: .18, roughness: .55, emissive: '#709b7e', emissiveIntensity: .24 });
  const logo = new THREE.Mesh(geometry, material);
  logo.name = 'Solid Nucleus sculpture'; logo.userData.logoObstacle = true;
  logo.position.set(0, LOGO_CENTER_Y, -LOGO_DEPTH / 2); logo.scale.set(LOGO_SCALE, LOGO_SCALE, 1);
  return logo;
}

function railGeometry(frames: ReturnType<typeof sampleTrack>[], offset: number, height: number, radius: number) {
  const sides = 5, vertices: number[] = [], indices: number[] = [];
  frames.forEach((f, i) => {
    for (let j = 0; j < sides; j++) {
      const angle = j / sides * Math.PI * 2;
      const p = f.point.clone().addScaledVector(f.side, offset + Math.cos(angle) * radius).addScaledVector(f.up, height + Math.sin(angle) * radius);
      vertices.push(p.x, p.y, p.z);
      if (i) { const a = (i - 1) * sides + j, b = (i - 1) * sides + (j + 1) % sides, c = i * sides + j, d = i * sides + (j + 1) % sides; indices.push(a, c, b, b, c, d); }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingSphere(); return geometry;
}

export function createScenery(scene: THREE.Scene, track: CoasterTrack, coarse: boolean) {
  const length = track.getLength();
  const dark = new THREE.MeshStandardMaterial({ color: '#173426', metalness: .3, roughness: .6 });
  const railMaterial = new THREE.MeshBasicMaterial({ color: MINT });
  const distantRailMaterial = new THREE.LineBasicMaterial({ color: '#9acba7' });
  const facade = new THREE.MeshLambertMaterial({ color: '#718b76', vertexColors: true });
  const foliage = new THREE.MeshLambertMaterial({ color: '#294e36' });
  const windowMaterial = new THREE.MeshBasicMaterial({ color: '#cab78d' });
  const upperWindowMaterial = new THREE.MeshBasicMaterial({ color: '#6e7561' });
  const box = new THREE.BoxGeometry(1, 1, 1), dummy = new THREE.Object3D(), basis = new THREE.Matrix4();
  const matrix = (x: number, y: number, z: number, w: number, h: number, d: number) => {
    dummy.position.set(x, y, z); dummy.quaternion.identity(); dummy.scale.set(w, h, d); dummy.updateMatrix(); return dummy.matrix.clone();
  };
  scene.add(createVerticalLogo());
  const ground = new THREE.GridHelper(800, 100, '#264b35', '#10271b'); ground.position.y = -3; scene.add(ground);
  const groundColors = ground.geometry.getAttribute('color'), groundPositions = ground.geometry.getAttribute('position');
  for (let i = 0; i < groundColors.count; i++) {
    const fade = Math.max(0, 1 - Math.hypot(groundPositions.getX(i), groundPositions.getZ(i)) / 400);
    groundColors.setXYZ(i, groundColors.getX(i) * fade, groundColors.getY(i) * fade, groundColors.getZ(i) * fade);
  }
  const terrainGeometry = new THREE.CircleGeometry(480, 64), terrainColors = new Float32Array(terrainGeometry.attributes.position.count * 3);
  const terrainTint = new THREE.Color('#0b2016'); terrainColors.set(terrainTint.toArray(), 0);
  terrainGeometry.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));
  const terrain = new THREE.Mesh(terrainGeometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
  terrain.rotation.x = -Math.PI / 2; terrain.position.y = -3.1; scene.add(terrain);
  const dais = new THREE.Mesh(new THREE.TorusGeometry(44, .07, 4, 100), railMaterial); dais.rotation.x = Math.PI / 2; dais.position.y = -2.6; scene.add(dais);

  // Short rail sections cull separately; vertices follow the exact physics curve.
  const divisions = Math.ceil(length / 1.1);
  const frames = Array.from({ length: divisions + 1 }, (_, i) => sampleTrack(track, length * i / divisions, length));
  const railLevels: THREE.LOD[] = [];
  for (let start = 0; start < divisions; start += 64) {
    const section = frames.slice(start, Math.min(divisions + 1, start + 65));
    const near = new THREE.Group(), lod = new THREE.LOD();
    const center = section[Math.floor(section.length / 2)].point;
    const rails = [-.68, .68].map(offset => railGeometry(section, offset, 0, .1));
    const paired = mergeGeometries(rails)!; rails.forEach(geometry => geometry.dispose());
    paired.translate(-center.x, -center.y, -center.z); near.add(new THREE.Mesh(paired, railMaterial));
    const spine = railGeometry(section, 0, -.32, .16).translate(-center.x, -center.y, -center.z); near.add(new THREE.Mesh(spine, dark));
    const segments: THREE.Vector3[] = [];
    for (const offset of [-.68, .68]) for (let i = 1; i < section.length; i++) {
      for (const f of [section[i - 1], section[i]]) segments.push(f.point.clone().addScaledVector(f.side, offset).sub(center));
    }
    const far = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segments), distantRailMaterial);
    lod.position.copy(center); lod.addLevel(near, 0); lod.addLevel(far, coarse ? 65 : 100, .12); scene.add(lod); railLevels.push(lod);
  }
  const sleepers: THREE.Matrix4[] = [], supports: THREE.Matrix4[] = [], supportFeet: THREE.Matrix4[] = [];
  for (let distance = 0; distance <= length; distance += 1.15) {
    const f = sampleTrack(track, distance, length);
    dummy.position.copy(f.point).addScaledVector(f.up, -.09);
    basis.makeBasis(f.side, f.up, f.tangent.clone().negate()); dummy.quaternion.setFromRotationMatrix(basis);
    dummy.scale.set(2.05, .12, .19); dummy.updateMatrix(); sleepers.push(dummy.matrix.clone());
  }
  const vertical = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  for (const part of createTrackSupports(track)) {
    direction.subVectors(part.end, part.start);
    dummy.position.copy(part.start).add(part.end).multiplyScalar(.5);
    dummy.quaternion.setFromUnitVectors(vertical, direction.clone().normalize());
    dummy.scale.set(part.radius, direction.length(), part.radius); dummy.updateMatrix(); supports.push(dummy.matrix.clone());
    if (part.kind === 'column') supportFeet.push(matrix(part.start.x, -2.85, part.start.z, .8, .3, .8));
  }
  batchInstances(scene, new THREE.CylinderGeometry(1, 1, 1, 6), dark, supports);
  batchInstances(scene, box, dark, [matrix(0, -1.5, 0, 78, 3, 13), ...supportFeet]);
  const sleeperBatches = batchInstances(scene, box, dark, sleepers, 32);

  const skyline = new THREE.Group(), landscape = new THREE.Group(), gates = new THREE.Group(); scene.add(skyline, landscape, gates);
  const detailBatches: THREE.InstancedMesh[] = [];
  const buildings: THREE.Matrix4[] = [], podiums: THREE.Matrix4[] = [], windows: THREE.Matrix4[] = [], upperWindows: THREE.Matrix4[] = [], roofs: THREE.Matrix4[] = [];
  let seed = 8932;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  CITY_BLOCKS.forEach(b => {
    podiums.push(matrix(b.x, -1.2, b.z, b.width + 5, 3.6, b.depth + 5));
    // Recessed lobby, full facade above, and a bevelled cap give the blocks depth.
    podiums.push(matrix(b.x, 2.8, b.z, b.width * .88, 4, b.depth * .88));
    buildings.push(matrix(b.x, (b.height + 5) / 2, b.z, b.width, b.height - 5, b.depth));
    roofs.push(matrix(b.x, b.height, b.z, b.width + .8, 2.2, b.depth + .8));
    buildings.push(matrix(b.x, b.height + 2.3, b.z, b.width * .54, 3, b.depth * .52));
    for (let floor = 0; floor < Math.floor(b.height / 3); floor++) for (const side of [-1, 1]) {
      const heightRatio = floor / Math.floor(b.height / 3);
      for (let column = 0; column < Math.floor(b.width / 2.4); column++) if (random() < .7 - heightRatio * .5)
        (heightRatio > .6 ? upperWindows : windows).push(matrix(b.x - b.width / 2 + 1.3 + column * 2.4, 6 + floor * 2.6, b.z + side * (b.depth / 2 + .04), 1.05, 1.35, .06));
    }
  });
  const facadeBox = box.clone(), facadeColors = new Float32Array(facadeBox.attributes.position.count * 3);
  const baseTint = new THREE.Color('#55705c'), crownTint = new THREE.Color('#c5d7bc');
  for (let i = 0; i < facadeBox.attributes.position.count; i++) new THREE.Color().lerpColors(baseTint, crownTint, facadeBox.attributes.position.getY(i) + .5).toArray(facadeColors, i * 3);
  facadeBox.setAttribute('color', new THREE.BufferAttribute(facadeColors, 3));
  const roofShape = new THREE.Shape().moveTo(-.46, -.46).lineTo(.46, -.46).lineTo(.46, .46).lineTo(-.46, .46).closePath();
  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { depth: .6, steps: 1, bevelEnabled: true, bevelThickness: .2, bevelSize: .04, bevelSegments: 1 }).rotateX(-Math.PI / 2);
  batchInstances(skyline, facadeBox, facade, buildings, 60); batchInstances(skyline, roofGeometry, dark, roofs, 60); batchInstances(skyline, box, dark, podiums, 60);
  detailBatches.push(...batchInstances(skyline, box, windowMaterial, windows, 60));
  detailBatches.push(...batchInstances(skyline, box, upperWindowMaterial, upperWindows, 60));
  const trunks: THREE.Matrix4[] = [], crowns: THREE.Matrix4[] = [], conifers: THREE.Matrix4[] = [], treePoints: THREE.Vector3[] = [];
  const landscapeRailSamples = frames.filter((_, i) => i % 4 === 0);
  for (let attempt = 0; attempt < 900 && trunks.length < 70; attempt++) {
    const x = (random() - .5) * 310, z = (random() - .35) * 330, tall = random() > .5, h = tall ? 9 + random() * 5 : 6 + random() * 3, r = tall ? 2.6 : 3.8;
    const tree = new THREE.Box3(new THREE.Vector3(x - r, -3, z - r), new THREE.Vector3(x + r, h - 3, z + r));
    const p = new THREE.Vector3(x, 0, z);
    if (Math.abs(x) < 46 && Math.abs(z) < 14 || BUILDING_BOUNDS.some(b => b.intersectsBox(tree)) || treePoints.some(other => other.distanceTo(p) < 9)) continue;
    const railDistance = Math.min(...landscapeRailSamples.map(f => tree.distanceToPoint(f.point)));
    if (railDistance < 5 || railDistance < 16 && random() < .7) continue;
    treePoints.push(p); trunks.push(matrix(x, -1, z, .45, 4, .45));
    (tall ? conifers : crowns).push(matrix(x, h * .6 - 3, z, r, h * (tall ? .8 : .4), r));
  }
  batchInstances(landscape, box, dark, trunks); batchInstances(landscape, new THREE.IcosahedronGeometry(1, 1), foliage, crowns);
  batchInstances(landscape, new THREE.ConeGeometry(1, 1, 7), foliage, conifers);
  const gateRecords: { mesh: THREE.Mesh; distance: number }[] = [];
  const gateGeometry = new THREE.TorusGeometry(3.65, .055, 4, 40, Math.PI * 1.72);
  for (let distance = 22; distance < length; distance += 70) {
    const f = sampleTrack(track, distance, length); if (logoClearance(f.point) < 9) continue;
    const mesh = new THREE.Mesh(gateGeometry, railMaterial); mesh.position.copy(f.point).addScaledVector(f.up, 1.8);
    basis.makeBasis(f.side, f.up, f.tangent.clone().negate()); mesh.quaternion.setFromRotationMatrix(basis);
    gates.add(mesh); gateRecords.push({ mesh, distance });
  }
  const particleCount = coarse ? 220 : 500, positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < positions.length; i += 3) positions.set([(random() - .5) * 250, random() * 120, (random() - .5) * 250], i);
  const particleGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)); particleGeometry.computeBoundingSphere();
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: '#719b7d', size: .16, sizeAttenuation: true })); scene.add(particles);

  const cart = new THREE.Group(), player = new THREE.Group(); scene.add(cart, player);
  const body = new THREE.Mesh(box, dark); body.scale.set(1.36, .3, 1.7); body.position.set(0, .14, -.2); cart.add(body);
  const nose = new THREE.Mesh(box, dark); nose.scale.set(1.36, .36, .35); nose.position.set(0, .45, -1.42); cart.add(nose);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, 1.32, 8), railMaterial); bar.rotation.z = Math.PI / 2; bar.position.set(0, .86, -1.15); cart.add(bar);
  player.add(new THREE.Mesh(new THREE.SphereGeometry(.65, 8, 6), railMaterial));
  const beacons = new Map<string, THREE.Group>();
  const beaconDistances = new Map<string, number>();
  // One palette per world: individual removals retain shared GPU resources;
  // disposeObject(scene) releases them once when the world is unmounted.
  const stationBox = box;
  const retained = { geometries: new Set<THREE.BufferGeometry>([stationBox]), materials: new Set<THREE.Material>([dark, railMaterial]) };
  function syncGates() { gateRecords.forEach(gate => { gate.mesh.visible = ![...beaconDistances.values()].some(distance => Math.min(Math.abs(gate.distance - distance), length - Math.abs(gate.distance - distance)) < 22); }); }
  let level: QualityLevel = coarse ? 1 : 2;
  function addStation(id: string, stop: StationPlacement, index: number, title: string, kind: 'event' | 'waypoint' = 'event') {
    if (beacons.has(id)) return;
    const f = sampleTrack(track, stop.distance, length), beacon = new THREE.Group();
    beacon.name = `Station ${index + 1}: ${title}`; beacon.position.copy(f.point);
    basis.makeBasis(f.side, f.up, f.tangent.clone().negate()); beacon.quaternion.setFromRotationMatrix(basis);
    const structural: THREE.Matrix4[] = [], lights: THREE.Matrix4[] = [];
    if (kind === 'waypoint') {
      const waypointGeometry = new THREE.OctahedronGeometry(.48);
      for (const side of [-1, 1]) {
        structural.push(matrix(side * 2.8, -.5, 0, 1.2, .3, 3.8), matrix(side * 2.8, 1.2, 0, .14, 2.6, .14));
        lights.push(matrix(side * 2.8, -.3, 0, .07, .07, 3.8));
        const gem = new THREE.Mesh(waypointGeometry, railMaterial); gem.position.set(side * 2.8, 2.9, 0); beacon.add(gem);
      }
    } else {
      for (const side of [-1, 1]) {
      structural.push(matrix(side * 3.3, -.65, 0, 3.2, .35, 12)); lights.push(matrix(side * 1.74, -.45, 0, .07, .07, 12));
      for (const z of [-5.4, 5.4]) structural.push(matrix(side * 4.55, 1.9, z, .2, 4.6, .2));
    }
    structural.push(matrix(0, 4.5, 0, 10, .2, 13)); lights.push(matrix(0, 4.35, 0, 1.3, .06, 10));
    }
    batchInstances(beacon, stationBox, dark, structural, 100); batchInstances(beacon, stationBox, railMaterial, lights, 100);
    const label = document.createElement('canvas'); label.width = 512; label.height = 128; const context = label.getContext('2d');
    if (context && kind === 'event') {
      context.fillStyle = '#06140c'; context.fillRect(0, 0, 512, 128); context.strokeStyle = MINT; context.strokeRect(2, 2, 508, 124);
      context.fillStyle = MINT; context.textAlign = 'center'; context.font = '16px sans-serif'; context.fillText(`STATION ${String(index + 1).padStart(2, '0')}`, 256, 34);
      context.font = '24px sans-serif'; context.fillText(title.length > 34 ? `${title.slice(0, 33)}…` : title, 256, 83, 470);
      const texture = new THREE.CanvasTexture(label); texture.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 1.65), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })); sign.position.set(0, 3.3, -5.8); beacon.add(sign);
    }
    beacon.traverse(object => { object.updateMatrix(); object.matrixAutoUpdate = false; }); scene.add(beacon); beacons.set(id, beacon);
    beaconDistances.set(id, stop.distance); syncGates();
  }
  scene.traverse(object => { if (object !== scene && object !== cart && object !== player) { object.updateMatrix(); object.matrixAutoUpdate = false; } });
  return {
    cart, player, addStation,
    removeStation(id: string) { const beacon = beacons.get(id); if (beacon) { disposeObject(beacon, retained); beacons.delete(id); beaconDistances.delete(id); syncGates(); } },
    setQuality(value: QualityLevel) {
      level = value; particleGeometry.setDrawRange(0, Math.floor(particleCount * [0, .45, 1][value]));
      railLevels.forEach(lod => { lod.levels[1].distance = [40, 65, 100][value]; });
    },
    update(_elapsed: number, _reduced: boolean, mapBlend: number, camera: THREE.Camera) {
      skyline.visible = mapBlend < .85; landscape.visible = level > 0 && mapBlend < .85; gates.visible = level > 0 && mapBlend < .85;
      particles.visible = level > 0 && mapBlend < .85; cart.visible = mapBlend < .15; player.visible = mapBlend > .5;
      for (const batch of sleeperBatches) batch.visible = mapBlend < .85 && batch.boundingSphere!.center.distanceToSquared(camera.position) < (level === 2 ? 100 : 55) ** 2;
      for (const batch of detailBatches) batch.visible = level > 0 && batch.boundingSphere!.center.distanceToSquared(camera.position) < (level === 2 ? 190 : 120) ** 2;
    },
  };
}
