import * as THREE from 'three';

/** Shared timber grain and a small felt weave keep the setting tactile at low cost. */
function surfaceTextures() {
  const woodCanvas = document.createElement('canvas'); woodCanvas.width = woodCanvas.height = 512;
  const woodContext = woodCanvas.getContext('2d')!;
  woodContext.fillStyle = '#d9c6a6'; woodContext.fillRect(0, 0, 512, 512);
  let seed = 91;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let line = 0; line < 420; line++) {
    const y = random() * 512, phase = random() * Math.PI * 2, amplitude = 1 + random() * 4;
    woodContext.strokeStyle = line % 5 === 0 ? 'rgba(255,242,211,.14)' : `rgba(89,58,30,${.025 + random() * .05})`;
    woodContext.lineWidth = .4 + random() * .8; woodContext.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      // Periodic grain stays continuous at the edges of the repeating tabletop.
      const yy = y + Math.sin(x / 512 * Math.PI * 2 + phase) * amplitude;
      if (x === 0) woodContext.moveTo(x, yy); else woodContext.lineTo(x, yy);
    }
    woodContext.stroke();
  }
  const wood = new THREE.CanvasTexture(woodCanvas);
  wood.colorSpace = THREE.SRGBColorSpace; wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.anisotropy = 4;

  const feltCanvas = document.createElement('canvas'); feltCanvas.width = feltCanvas.height = 128;
  const feltContext = feltCanvas.getContext('2d')!, weave = feltContext.createImageData(128, 128);
  for (let i = 0; i < weave.data.length; i += 4) {
    const value = 175 + Math.floor(random() * 35);
    weave.data[i] = weave.data[i + 1] = weave.data[i + 2] = value; weave.data[i + 3] = 255;
  }
  feltContext.putImageData(weave, 0, 0);
  const felt = new THREE.CanvasTexture(feltCanvas); felt.wrapS = felt.wrapT = THREE.RepeatWrapping;
  return { wood, felt };
}

/** A quiet timber tabletop and felt-lined board, using three scenery draws. */
export function createTowerScenery(scene: THREE.Scene, floorY: number, towerHeight: number, compact: boolean) {
  const group = new THREE.Group(); group.name = 'people-tower-scenery'; scene.add(group);
  const materials: THREE.Material[] = [], geometries: THREE.BufferGeometry[] = [];
  const { wood, felt } = surfaceTextures();
  // Use the site's own mint, sage and dark surface tokens for the light palette.
  const theme = getComputedStyle(document.documentElement);
  const mint = new THREE.Color(theme.getPropertyValue('--mint').trim() || '#c3e5c8');
  const sage = new THREE.Color(theme.getPropertyValue('--muted').trim() || '#93ac97');
  const backdrop = new THREE.Color(theme.getPropertyValue('--surface').trim() || '#080b08');
  group.add(new THREE.AmbientLight(mint, .25));
  group.add(new THREE.HemisphereLight(mint.clone().lerp(new THREE.Color(0xffffff), .18), 0x183224, .85));
  const key = new THREE.DirectionalLight(mint, 2.15); key.position.set(-5, towerHeight + 5, 6);
  key.castShadow = true; key.shadow.mapSize.setScalar(compact ? 512 : 1024);
  const extent = Math.max(5.5, towerHeight * .7);
  Object.assign(key.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: .5, far: towerHeight * 2 + 22 });
  key.shadow.normalBias = .025; key.shadow.bias = -.0002; group.add(key);
  const rim = new THREE.DirectionalLight(sage, .85); rim.position.set(5, 4, -6); group.add(rim);

  function material(options: THREE.MeshStandardMaterialParameters) {
    const result = new THREE.MeshStandardMaterial(options); materials.push(result); return result;
  }
  function mesh(name: string, geometry: THREE.BufferGeometry, surface: THREE.Material, y: number) {
    geometries.push(geometry);
    const object = new THREE.Mesh(geometry, surface); object.name = name; object.position.y = y;
    object.receiveShadow = true; group.add(object); return object;
  }

  // The tabletop and board still coincide with the existing physical surfaces.
  const tabletop = new THREE.PlaneGeometry(240, 240);
  const tabletopUV = tabletop.getAttribute('uv');
  for (let i = 0; i < tabletopUV.count; i++) tabletopUV.setXY(i, tabletopUV.getX(i) * 32, tabletopUV.getY(i) * 32);
  const floor = mesh('timber-tabletop', tabletop, material({
    color: 0x40352b, map: wood, roughness: .86, metalness: 0,
  }), floorY - .28);
  floor.rotation.x = -Math.PI / 2;

  mesh('wooden-board', new THREE.CylinderGeometry(2.6, 2.75, .28, 64), material({
    color: 0xa58e6b, map: wood, bumpMap: wood, bumpScale: .004, roughness: .63, metalness: 0,
  }), floorY - .14);

  // A narrow timber border frames the green playing surface. The weave only
  // changes the normal; it adds no polygons or lighting passes.
  const inset = new THREE.CircleGeometry(2.48, 64), insetUV = inset.getAttribute('uv');
  for (let i = 0; i < insetUV.count; i++) insetUV.setXY(i, insetUV.getX(i) * 18, insetUV.getY(i) * 18);
  const mat = mesh('green-felt-inset', inset, material({
    color: 0x1c382b, bumpMap: felt, bumpScale: .003, roughness: 1, metalness: 0,
  }), floorY + .001);
  mat.rotation.x = -Math.PI / 2;

  // Match the page's dark green surface and blend the tabletop into it.
  scene.background = backdrop;
  scene.fog = new THREE.Fog(backdrop, 13, 34);

  return () => {
    group.removeFromParent(); geometries.forEach(geometry => geometry.dispose());
    materials.forEach(surface => surface.dispose()); wood.dispose(); felt.dispose(); key.shadow.dispose();
    scene.background = null; scene.fog = null;
  };
}

