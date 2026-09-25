import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ClubEvent } from '../types';
import { advanceRide, distanceToStation } from '../lib/ride-motion';

interface Props { events: ClubEvent[]; selected: number; requestId: number; playing: boolean; overview: boolean; reduced: boolean; onReady: () => void; onError: () => void; onArrive: () => void; onProgress: (progress: number) => void; onStationClick?: (index: number) => void; }
export default function BrainRide(props: Props) {
  const mount = useRef<HTMLDivElement>(null), live = useRef(props);
  live.current = props;
  useEffect(() => {
    const host = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); }
    catch { live.current.onError(); return; }
    const mobile = window.matchMedia('(max-width: 768px)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.7));
    renderer.setClearColor(0x080f15);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Interactive brain landscape with a roller coaster connecting event stations');
    renderer.domElement.setAttribute('role', 'img');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080f15, 0.025);
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
    camera.position.set(16, 11, 19);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.2, 0); controls.enableDamping = true; controls.dampingFactor = 0.055;
    controls.enablePan = false; controls.enableZoom = false; controls.minDistance = 9; controls.maxDistance = 32; controls.maxPolarAngle = Math.PI * 0.47;
    scene.add(new THREE.HemisphereLight(0xd4fff0, 0x13202e, 2.4));
    const keyLight = new THREE.DirectionalLight(0xc0ffe0, 4); keyLight.position.set(4, 12, 7); scene.add(keyLight);
    const rim = new THREE.PointLight(0x9182ed, 65, 22); rim.position.set(-5, 5, -4); scene.add(rim);
    const teal = new THREE.PointLight(0x64dfbc, 55, 20); teal.position.set(6, 4, 3); scene.add(teal);
    const brain = new THREE.Group(); scene.add(brain); brain.position.y = 3.5;
    const brainMaterial = new THREE.MeshStandardMaterial({ color: 0x538c85, roughness: 0.56, metalness: 0.24, emissive: 0x193c3b, emissiveIntensity: 0.55 });
    function surface(theta: number, phi: number, sign: number, extra = 0) {
      const fold = 1 + 0.055 * Math.sin(theta * 11 + 2.4 * Math.sin(phi * 5)) * Math.sin(phi * 10 + Math.sin(theta * 5));
      return new THREE.Vector3(sign * 0.98 + Math.sin(phi) * Math.cos(theta) * (1.13 + extra) * fold, Math.cos(phi) * (2.04 + extra) * fold, Math.sin(phi) * Math.sin(theta) * (2.33 + extra) * fold);
    }
    for (const sign of [-1, 1]) {
      const geometry = new THREE.SphereGeometry(1, mobile ? 60 : 88, mobile ? 44 : 60);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(positions, i).normalize();
        const p = surface(Math.atan2(v.z, v.x), Math.acos(THREE.MathUtils.clamp(v.y, -1, 1)), sign);
        positions.setXYZ(i, p.x, p.y, p.z);
      }
      geometry.computeVertexNormals(); brain.add(new THREE.Mesh(geometry, brainMaterial));
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xa6f0d5, transparent: true, opacity: 0.26 });
      for (let line = 1; line < 14; line++) {
        const points = [];
        for (let j = 0; j <= 150; j++) {
          const theta = j / 150 * Math.PI * 2;
          const phi = line / 14 * Math.PI + 0.035 * Math.sin(theta * 8 + line);
          points.push(surface(theta, phi, sign, 0.018));
        }
        brain.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
      }
    }
    const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.5, 5, 10), brainMaterial); stem.position.set(0, -2, 0.5); stem.rotation.x = -0.2; brain.add(stem);
    // A deterministic field keeps the scene consistent across devices and remounts.
    let randomSeed = 419;
    function rand() { randomSeed = (randomSeed * 16807) % 2147483647; return (randomSeed - 1) / 2147483646; }
    const dust = new Float32Array((mobile ? 220 : 450) * 3);
    for (let i = 0; i < dust.length; i += 3) { dust[i] = (rand() - 0.5) * 65; dust[i + 1] = rand() * 28; dust[i + 2] = (rand() - 0.5) * 65; }
    const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xaad8d2, size: 0.035, transparent: true, opacity: 0.6 })));
    const floor = new THREE.GridHelper(90, 90, 0x215547, 0x15332f); floor.position.y = -0.7; (floor.material as THREE.Material).transparent = true; (floor.material as THREE.Material).opacity = 0.34; scene.add(floor);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x71d9b5, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const halo = new THREE.Mesh(new THREE.RingGeometry(3.7, 3.72, 96), haloMat); halo.rotation.x = -Math.PI / 2; halo.position.y = -0.65; scene.add(halo);
    const halo2 = halo.clone(); halo2.scale.setScalar(1.2); scene.add(halo2);

    const waypoints = Array.from({ length: 16 }, (_, i) => {
      const angle = i / 16 * Math.PI * 2;
      const radius = 7.1 + 0.75 * Math.sin(angle * 3);
      return new THREE.Vector3(Math.cos(angle) * radius, 1.35 + Math.sin(angle * 2 + 0.4) * 0.85 + Math.cos(angle) * 0.25, Math.sin(angle) * radius);
    });
    const track = new THREE.CatmullRomCurve3(waypoints, true, 'catmullrom', 0.5);
    const up = new THREE.Vector3(0, 1, 0);
    class Rail extends THREE.Curve<THREE.Vector3> {
      constructor(private offset: number) { super(); }
      getPoint(t: number, target = new THREE.Vector3()) { const p = track.getPointAt(t % 1); const tangent = track.getTangentAt(t % 1); return target.copy(p).add(new THREE.Vector3().crossVectors(tangent, up).normalize().multiplyScalar(this.offset)); }
    }
    const railMat = new THREE.MeshStandardMaterial({ color: 0x91ddc4, metalness: 0.65, roughness: 0.35, emissive: 0x478e79, emissiveIntensity: 0.6 });
    for (const offset of [-0.4, 0.4]) scene.add(new THREE.Mesh(new THREE.TubeGeometry(new Rail(offset), mobile ? 280 : 440, 0.055, 6, true), railMat));
    const tieGeo = new THREE.BoxGeometry(1.06, 0.08, 0.12), supportGeo = new THREE.CylinderGeometry(0.045, 0.07, 1, 5);
    const ties = new THREE.InstancedMesh(tieGeo, new THREE.MeshStandardMaterial({ color: 0x386758, metalness: 0.45, roughness: 0.7 }), 180);
    const supports = new THREE.InstancedMesh(supportGeo, new THREE.MeshStandardMaterial({ color: 0x355348, metalness: 0.3 }), 45);
    const object = new THREE.Object3D();
    for (let i = 0; i < 180; i++) { const p = track.getPointAt(i / 180); object.position.copy(p); object.lookAt(p.clone().add(track.getTangentAt(i / 180))); object.updateMatrix(); ties.setMatrixAt(i, object.matrix); }
    for (let i = 0; i < 45; i++) { const p = track.getPointAt(i / 45); const height = p.y + 0.7; object.position.set(p.x, height / 2 - 0.7, p.z); object.rotation.set(0, 0, 0); object.scale.set(1, height, 1); object.updateMatrix(); supports.setMatrixAt(i, object.matrix); }
    scene.add(ties, supports);
    const cart = new THREE.Group();
    const cartBody = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.34, 1), new THREE.MeshStandardMaterial({ color: 0xe6bb74, metalness: 0.5, roughness: 0.35 })); cartBody.position.y = 0.3; cart.add(cartBody);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.38, 0.13), new THREE.MeshStandardMaterial({ color: 0x14261f })); seat.position.set(0, 0.6, 0.28); cart.add(seat); scene.add(cart);
    const stationTimes = props.events.map((_, i) => 0.07 + i / props.events.length);
    const markers: THREE.Mesh[] = [];
    for (let index = 0; index < stationTimes.length; index++) {
      const p = track.getPointAt(stationTimes[index] % 1), angle = Math.atan2(p.z, p.x);
      const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const location = p.clone().add(radial.multiplyScalar(1.1)); location.y += 1.2;
      const marker = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: 0xc5ffe4, emissive: 0x82e0b5, emissiveIntensity: 1.4, metalness: 0.1, roughness: 0.35 }));
      marker.position.copy(location); marker.userData.index = index; markers.push(marker); scene.add(marker);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.016, 5, 32), new THREE.MeshBasicMaterial({ color: 0x89debf })); ring.position.copy(location); ring.rotation.y = -angle; scene.add(ring);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, location]), new THREE.LineBasicMaterial({ color: 0x70c4a5, transparent: true, opacity: 0.45 })); scene.add(line);
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 80;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#cbf5e2'; ctx.font = '500 38px monospace'; ctx.textAlign = 'center'; ctx.fillText(String(index + 1).padStart(2, '0'), 64, 48);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false })); sprite.position.copy(location).add(new THREE.Vector3(0, 0.65, 0)); sprite.scale.set(0.9, 0.56, 1); scene.add(sprite);
    }
    const neuralPoints = Array.from({ length: 35 }, () => new THREE.Vector3((rand() - 0.5) * 7.4, rand() * 5.5 + 0.2, (rand() - 0.5) * 7.4));
    const connections: THREE.Vector3[] = [];
    for (let i = 0; i < neuralPoints.length; i++) for (let j = i + 1; j < neuralPoints.length; j++) if (neuralPoints[i].distanceTo(neuralPoints[j]) < 2.3) connections.push(neuralPoints[i], neuralPoints[j]);
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(connections), new THREE.LineBasicMaterial({ color: 0x57a38e, transparent: true, opacity: 0.22 })));
    scene.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(neuralPoints), new THREE.PointsMaterial({ color: 0xcaffdd, size: 0.075 })));

    let frame = 0, disposed = false, visible = true, lastTime = 0, lastProgress = 0, position = 0, target = stationTimes[0] || 0;
    let lastSelected = props.selected, lastRequest = props.requestId, lastOverview = true, arrived = false, dirty = true;
    let remainingDistance = distanceToStation(position, target);
    const cameraPosition = new THREE.Vector3(), lookPosition = new THREE.Vector3();
    function draw(time: number) {
      if (disposed) return;
      if (!visible || document.hidden) { frame = 0; lastTime = 0; return; }
      frame = requestAnimationFrame(draw);
      const elapsed = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
      if (lastTime && time - lastTime < (mobile ? 32 : 15)) return;
      lastTime = time;
      const state = live.current;
      if (state.selected !== lastSelected || state.requestId !== lastRequest) { lastSelected = state.selected; lastRequest = state.requestId; target = stationTimes[state.selected] || 0; remainingDistance = distanceToStation(position, target); arrived = false; dirty = true; }
      if (state.overview !== lastOverview) {
        lastOverview = state.overview; controls.enabled = state.overview; dirty = true;
        if (state.overview) { camera.position.set(16, 11, 19); controls.target.set(0, 2.2, 0); }
        else { target = stationTimes[state.selected] || 0; remainingDistance = distanceToStation(position, target); arrived = false; }
      }
      if (!state.overview) {
        if (state.reduced) { position = target; arrived = true; }
        else if (state.playing && !arrived) {
          const next = advanceRide(position, remainingDistance, elapsed, true);
          position = next.position; remainingDistance = next.remaining;
          if (next.arrived) { position = target; arrived = true; state.onArrive(); }
        }
        cameraPosition.copy(track.getPointAt(position)).add(new THREE.Vector3(0, 1.1, 0));
        lookPosition.copy(track.getPointAt((position + 0.032) % 1)).add(new THREE.Vector3(0, 1.0, 0));
        const moving = camera.position.distanceToSquared(cameraPosition) > 0.00001;
        if (state.reduced) camera.position.copy(cameraPosition); else camera.position.lerp(cameraPosition, Math.min(1, elapsed * 3.4));
        camera.lookAt(lookPosition);
        if (moving || state.playing) dirty = true;
      } else if (controls.update()) dirty = true;
      cart.visible = state.overview; const cp = track.getPointAt(position); cart.position.copy(cp); cart.lookAt(cp.clone().add(track.getTangentAt(position)));
      for (let i = 0; i < markers.length; i++) markers[i].scale.setScalar(i === state.selected ? 1.35 : 1);
      if (dirty || state.playing) { renderer.render(scene, camera); dirty = false; }
      if (time - lastProgress > 200 && state.playing) { state.onProgress(position); lastProgress = time; }
    }
    function schedule() { if (!frame && !disposed && visible && !document.hidden) frame = requestAnimationFrame(draw); }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { dirty = true; schedule(); } }, { rootMargin: '80px' }); observer.observe(host);
    const resize = new ResizeObserver(() => { const width = host.clientWidth, height = host.clientHeight; if (width && height) { renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); dirty = true; schedule(); } }); resize.observe(host);
    const visibility = () => { if (!document.hidden) { dirty = true; schedule(); } }; document.addEventListener('visibilitychange', visibility);
    controls.addEventListener('change', () => { dirty = true; });
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let downX = 0, downY = 0;
    const down = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; };
    const click = (e: PointerEvent) => { if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 7) return; const rect = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(markers)[0]; if (hit) live.current.onStationClick?.(hit.object.userData.index); };
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', click);
    const contextLost = (e: Event) => { e.preventDefault(); live.current.onError(); }; renderer.domElement.addEventListener('webglcontextlost', contextLost);
    schedule(); live.current.onReady();
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); document.removeEventListener('visibilitychange', visibility); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', click); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
      scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { materials.add(material); const map = (material as THREE.MeshBasicMaterial).map; if (map) textures.add(map); } });
      geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, [props.events.length, props.reduced]);
  return <div className="brain-scene" ref={mount} />;
}
