import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { LogoWorldProps } from '../components/LogoWorld';
import { WORLD, SPAWN, START_YAW, movePlayer, nearestStation, updateArrival, type ArrivalState, type Point } from './event-navigation';

const HEIGHT = 4.4;
const EYE = 1.65;

function shapeFrom(outline: number[][], holes: number[][][] = []) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  shape.holes = holes.map(hole => new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))));
  return shape;
}

export function createEventWorld(host: HTMLDivElement, get: () => LogoWorldProps) {
  const stations = get().stations;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !coarse, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.35 : 1.75));
  renderer.setClearColor(0x081210);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1, 0.06, 220);
  camera.rotation.order = 'YXZ';
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = false;
  orbit.enablePan = false;
  orbit.minDistance = 42;
  orbit.maxDistance = 180;
  orbit.minPolarAngle = 0.1;
  orbit.maxPolarAngle = Math.PI * 0.4;
  orbit.target.set(0, 0, 0);
  const textures: THREE.Texture[] = [];
  let disposed = false, frame = 0, last = 0, visible = true;
  let position: Point = { ...SPAWN }, yaw = START_YAW, pitch = 0;
  let mode: string = '', command = -1, paused = false, elapsed = 0, reportAt = 0;
  let arrival: ArrivalState = { candidate: null, stillFor: 0, dismissed: null };
  const keys = new Set<string>();
  let drag: { id: number; x: number; y: number } | null = null;
  const direction = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const markers = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-world-station]'));

  const ambient = new THREE.HemisphereLight(0xc9ffe6, 0x152823, 2.1);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xd3ffec, 3.2);
  key.position.set(-12, 30, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x81cfc5, 2);
  rim.position.set(14, 12, -20); scene.add(rim);
  const lantern = new THREE.PointLight(0xc9ffe4, 14, 15, 1.7);
  scene.add(lantern);

  const wallTop = new THREE.MeshStandardMaterial({ color: 0x79b79f, metalness: 0.35, roughness: 0.5 });
  const wallSide = new THREE.MeshStandardMaterial({ color: 0x24564b, metalness: 0.32, roughness: 0.48 });
  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0xb6efd3, transparent: true, opacity: 0.42 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x163c32, metalness: 0.15, roughness: 0.85 });
  const foundationMaterial = new THREE.MeshStandardMaterial({ color: 0x19392f, metalness: 0.35, roughness: 0.6 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x14382e, side: THREE.DoubleSide, roughness: 0.9 });
  const roof = new THREE.Group();
  const gridCanvas = document.createElement('canvas'); gridCanvas.width = gridCanvas.height = 128;
  const gridContext = gridCanvas.getContext('2d');
  if (gridContext) {
    gridContext.fillStyle = '#25483c'; gridContext.fillRect(0, 0, 128, 128);
    gridContext.strokeStyle = '#436b56'; gridContext.lineWidth = 1;
    gridContext.strokeRect(0, 0, 128, 128);
    gridContext.fillStyle = '#668d6f'; gridContext.fillRect(62, 62, 3, 3);
    const texture = new THREE.CanvasTexture(gridCanvas); textures.push(texture);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(0.6, 0.6);
    texture.colorSpace = THREE.SRGBColorSpace; floorMaterial.map = texture;
  }

  for (const outline of WORLD.floor) {
    const shape = shapeFrom(outline);
    const base = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false }), foundationMaterial);
    base.rotation.x = -Math.PI / 2; base.position.y = -0.72; scene.add(base);
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(shape), floorMaterial);
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
    const ceiling = new THREE.Mesh(new THREE.ShapeGeometry(shape), roofMaterial);
    ceiling.rotation.x = -Math.PI / 2; ceiling.position.y = HEIGHT; roof.add(ceiling);
    // Seal the outer silhouette; its inner partitions are the original logo ink.
    const vertices: number[] = [];
    outline.forEach(([x, z], i) => {
      const [xx, zz] = outline[(i + 1) % outline.length];
      vertices.push(x, 0, z, xx, 0, zz, x, HEIGHT, z, xx, 0, zz, xx, HEIGHT, zz, x, HEIGHT, z);
    });
    const shellGeometry = new THREE.BufferGeometry();
    shellGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    shellGeometry.computeVertexNormals();
    const shellMaterial = wallSide.clone(); shellMaterial.side = THREE.DoubleSide;
    scene.add(new THREE.Mesh(shellGeometry, shellMaterial));
    const edgePoints = [...outline, outline[0]].map(([x, z]) => new THREE.Vector3(x, HEIGHT + 0.02, z));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePoints), outlineMaterial));
  }
  scene.add(roof);
  for (const wall of WORLD.walls) {
    const geometry = new THREE.ExtrudeGeometry(shapeFrom(wall.outline, wall.holes), {
      depth: HEIGHT, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.025, bevelThickness: 0.025,
    });
    const mesh = new THREE.Mesh(geometry, [wallTop, wallSide]);
    mesh.rotation.x = -Math.PI / 2; scene.add(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 32), outlineMaterial);
    edges.rotation.x = -Math.PI / 2; scene.add(edges);
  }

  const grid = new THREE.GridHelper(160, 80, 0x284638, 0x172e24);
  grid.position.y = -0.76;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.44;
  scene.add(grid);
  const route = new THREE.CurvePath<THREE.Vector3>();
  WORLD.route.forEach(([x, z], i) => {
    if (!i) return;
    route.add(new THREE.LineCurve3(new THREE.Vector3(WORLD.route[i - 1][0], 0.025, WORLD.route[i - 1][1]), new THREE.Vector3(x, 0.025, z)));
  });
  const trail = new THREE.Mesh(new THREE.TubeGeometry(route, 320, 0.025, 4, false), new THREE.MeshBasicMaterial({ color: 0xd9c395 }));
  scene.add(trail);
  const dotGeometry = new THREE.SphereGeometry(0.065, 5, 4);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xe9d7a9 });
  const dots = new THREE.InstancedMesh(dotGeometry, dotMaterial, 120);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 120; i++) {
    dummy.position.copy(route.getPoint(i / 119)); dummy.position.y = 0.065;
    dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix);
  }
  scene.add(dots);

  const stationRings: THREE.Mesh[] = [];
  const stationSigns = new THREE.Group();
  const gold = new THREE.MeshBasicMaterial({ color: 0xe9d7a9 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xd6c48e, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
  for (const station of stations) {
    const { x, z } = station.position;
    const ringRadius = Math.min(1.05, station.radius * 0.7);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, 0.035, 5, 40), gold);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.07, z); scene.add(ring); stationRings.push(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(ringRadius, 40), glow);
    disc.rotation.x = -Math.PI / 2; disc.position.set(x, 0.04, z); scene.add(disc);
    const floating = new THREE.Mesh(new THREE.OctahedronGeometry(0.19), gold);
    floating.position.set(x, 2.6, z); scene.add(floating);
    const label = document.createElement('canvas'); label.width = 256; label.height = 128;
    const ctx = label.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0b1b17'; ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = '#bcae81'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, 252, 124);
      ctx.fillStyle = '#ecdfbc'; ctx.textAlign = 'center'; ctx.font = '48px monospace'; ctx.fillText(station.number, 128, 61);
      ctx.font = '15px monospace'; ctx.fillText('EVENT STATION', 128, 98);
      const texture = new THREE.CanvasTexture(label); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
      sign.position.set(x, 3.3, z); sign.scale.set(1.8, 0.9, 1); stationSigns.add(sign);
    }
  }
  scene.add(stationSigns);
  const player = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1, 3), new THREE.MeshBasicMaterial({ color: 0xecfff4 }));
  player.rotation.x = -Math.PI / 2; player.position.set(position.x, HEIGHT + 0.6, position.z); scene.add(player);

  function resetInput() { keys.clear(); drag = null; get().input.current = { x: 0, y: 0 }; }
  function focus() { host.focus({ preventScroll: true }); }
  function releasePointer() { if (document.pointerLockElement === renderer.domElement) document.exitPointerLock(); }
  function size() {
    const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.clearViewOffset();
    if (get().mode === 'overview') {
      if (width >= 900) camera.setViewOffset(width, height, -width * 0.13, 0, width, height);
      camera.fov = 43;
    } else camera.fov = width < 700 ? 78 : 70;
    camera.updateProjectionMatrix();
  }
  function setMapCamera() {
    const aspect = Math.max(host.clientWidth / Math.max(host.clientHeight, 1), 0.4);
    const base = window.innerWidth < 900 ? 54 : 68;
    const distance = aspect < 1 ? base / aspect : base;
    camera.position.set(0, distance, distance * 0.53);
    orbit.target.set(0, 0, 0); camera.lookAt(orbit.target); orbit.update();
  }
  function openStation(index: number) {
    arrival = { candidate: index, stillFor: 0, dismissed: index };
    resetInput(); releasePointer(); get().onArrive(index);
  }

  const controlled = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const keydown = (e: KeyboardEvent) => {
    if (get().mode !== 'explore' || get().paused || e.altKey || e.ctrlKey || e.metaKey) return;
    if (controlled.has(e.code)) { e.preventDefault(); keys.add(e.code); }
    if (e.code === 'KeyE' && !e.repeat) {
      const near = nearestStation(position, stations);
      if (near.distance <= stations[near.index].radius) { e.preventDefault(); openStation(near.index); }
    }
    if (e.code === 'KeyL' && !e.repeat) {
      e.preventDefault();
      // Pointer lock is optional: drag-to-look remains available if rejected.
      try { renderer.domElement.requestPointerLock()?.catch(() => {}); } catch { /* Drag still works. */ }
    }
  };
  const keyup = (e: KeyboardEvent) => keys.delete(e.code);
  const pointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || get().mode !== 'explore' || get().paused) return;
    focus(); drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    renderer.domElement.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: PointerEvent) => {
    if (get().mode !== 'explore' || get().paused) return;
    const locked = document.pointerLockElement === renderer.domElement;
    if (!locked && (!drag || e.pointerId !== drag.id)) return;
    const dx = locked ? e.movementX : e.clientX - drag!.x;
    const dy = locked ? e.movementY : e.clientY - drag!.y;
    yaw -= dx * 0.0035; pitch = THREE.MathUtils.clamp(pitch - dy * 0.003, -0.95, 0.95);
    if (drag) { drag.x = e.clientX; drag.y = e.clientY; }
  };
  const pointerUp = () => { drag = null; };
  const contextLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(frame); get().onError(); };
  function visibility() {
    resetInput(); last = 0; cancelAnimationFrame(frame);
    if (!document.hidden && visible && !disposed) frame = requestAnimationFrame(animate);
  }

  function animate(now: number) {
    if (disposed || document.hidden || !visible) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now; elapsed += dt;
    const props = get();
    if (command !== props.command.serial) {
      command = props.command.serial;
      const destination = props.command.station;
      position = destination === null ? { ...SPAWN } : { ...stations[destination].position };
      yaw = START_YAW; pitch = 0; resetInput();
      arrival = { candidate: null, stillFor: 0, dismissed: destination };
      if (props.mode === 'explore') focus();
    }
    if (mode !== props.mode) {
      mode = props.mode; orbit.enabled = mode === 'overview'; resetInput(); releasePointer();
      roof.visible = mode === 'explore'; player.visible = mode === 'overview'; stationSigns.visible = mode === 'explore';
      if (mode === 'overview') setMapCamera(); else focus();
      scene.fog = mode === 'explore' ? new THREE.FogExp2(0x0b211a, 0.035) : null;
      size();
    }
    if (paused !== props.paused) {
      paused = props.paused; resetInput(); releasePointer(); arrival.stillFor = 0;
      if (paused && mode === 'explore') {
        const near = nearestStation(position, stations);
        if (near.distance <= stations[near.index].radius) arrival.dismissed = near.index;
      }
      if (!paused && mode === 'explore') focus();
    }
    orbit.enabled = mode === 'overview' && !paused;
    let moving = false;
    if (mode === 'explore') {
      const active = !paused && (host.contains(document.activeElement) || document.pointerLockElement === renderer.domElement);
      if (active) {
        yaw += ((keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)) * dt * 1.65;
        const input = {
          x: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + props.input.current.x,
          y: (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + props.input.current.y,
        };
        moving = Math.hypot(input.x, input.y) > 0.06 || keys.has('ArrowLeft') || keys.has('ArrowRight') || drag !== null;
        position = movePlayer(position, input, yaw, dt);
        const next = updateArrival(arrival, position, moving, dt, stations);
        arrival = next;
        if (next.arrived !== null) openStation(next.arrived);
      } else { keys.clear(); arrival.stillFor = 0; }
      camera.position.set(position.x, EYE, position.z);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    } else {
      orbit.update();
      markers.forEach((marker, i) => {
        projected.set(stations[i].position.x, HEIGHT + 0.8, stations[i].position.z).project(camera);
        marker.style.left = `${(projected.x * 0.5 + 0.5) * host.clientWidth}px`;
        marker.style.top = `${(-projected.y * 0.5 + 0.5) * host.clientHeight}px`;
        marker.style.visibility = projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 ? 'hidden' : 'visible';
      });
    }
    camera.getWorldDirection(direction);
    lantern.position.copy(camera.position).addScaledVector(direction, 1.2);
    lantern.intensity = mode === 'explore' ? 14 : 0;
    player.position.set(position.x, HEIGHT + 0.6, position.z); player.rotation.z = -yaw;
    stationRings.forEach((ring, i) => {
      const scale = props.reduced || paused || mode === 'overview' ? 1 : 1 + Math.sin(elapsed * 1.7 + i) * 0.035;
      ring.scale.setScalar(scale);
    });
    if (elapsed >= reportAt) {
      reportAt = elapsed + 0.1;
      const near = nearestStation(position, stations);
      props.onSnapshot({ ...position, yaw, nearest: near.distance <= stations[near.index].radius ? near.index : null, distance: near.distance, moving });
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }

  const resize = new ResizeObserver(() => { size(); if (get().mode === 'overview') setMapCamera(); });
  resize.observe(host);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibility(); });
  intersection.observe(host);
  host.addEventListener('keydown', keydown);
  host.addEventListener('focusout', resetInput);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', resetInput);
  document.addEventListener('visibilitychange', visibility);
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', pointerUp);
  renderer.domElement.addEventListener('lostpointercapture', pointerUp);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  size(); frame = requestAnimationFrame(animate); get().onReady();

  return () => {
    disposed = true; cancelAnimationFrame(frame); resetInput(); releasePointer();
    resize.disconnect(); intersection.disconnect(); orbit.dispose();
    host.removeEventListener('keydown', keydown); host.removeEventListener('focusout', resetInput);
    window.removeEventListener('keyup', keyup); window.removeEventListener('blur', resetInput);
    document.removeEventListener('visibilitychange', visibility);
    renderer.domElement.removeEventListener('pointerdown', pointerDown);
    renderer.domElement.removeEventListener('pointermove', pointerMove);
    renderer.domElement.removeEventListener('pointerup', pointerUp);
    renderer.domElement.removeEventListener('pointercancel', pointerUp);
    renderer.domElement.removeEventListener('lostpointercapture', pointerUp);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m));
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose());
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  };
}
