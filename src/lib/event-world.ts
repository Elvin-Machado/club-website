import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { LogoWorldProps } from '../components/shared/LogoWorld';
import { cameraBank, createCoasterTrack, createCoasterStops, sampleTrack, stepCoasterJourney, initialCoasterJourney, departCoasterStation, LOGO_CENTER_Y, COASTER_SPEED } from './event-coaster';
import { createScenery } from './event-scenery';

export function createEventWorld(host: HTMLDivElement, get: () => LogoWorldProps) {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.25 : 1.5));
  renderer.setClearColor('#000000');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#000000', .0045);
  const camera = new THREE.PerspectiveCamera(70, 1, .06, 1600);
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: coarse ? 0 : 2 });
  const composer = new EffectComposer(renderer, renderTarget);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .65, .65, .85);
  const output = new OutputPass();
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(output);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enabled = false; orbit.enablePan = false; orbit.enableDamping = true; orbit.dampingFactor = .055;
  orbit.minPolarAngle = .15; orbit.maxPolarAngle = Math.PI * .8;
  orbit.rotateSpeed = .5; orbit.zoomSpeed = .6; orbit.autoRotateSpeed = .3;
  orbit.target.set(0, LOGO_CENTER_Y, 5);
  scene.add(new THREE.HemisphereLight('#d3ffe2', '#082019', 1.4));
  const light = new THREE.DirectionalLight('#c3e5c8', 2.6); light.position.set(-25, 45, 18); scene.add(light);
  const rim = new THREE.DirectionalLight('#78d5a1', 1.5); rim.position.set(25, 15, -35); scene.add(rim);
  const track = createCoasterTrack(), length = track.getLength();
  const stopDefinitions = createCoasterStops(track, get().stations.length);
  const stops = stopDefinitions.map(stop => stop.distance);
  const scenery = createScenery(scene, track, stopDefinitions, coarse, get().stations.map((station: any) => station.name));
  const markers = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-world-station]'));
  const controlsRoot = host.parentElement ?? host;
  const stopPoints = stops.map(distance => sampleTrack(track, distance, length).point.add(new THREE.Vector3(0, 5.1, 0)));
  const keys = new Set<string>();
  const controlled = new Set(['KeyW', 'KeyD', 'KeyS', 'KeyA', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  let journey = initialCoasterJourney(), motion = journey.motion;
  let mode = get().mode, command = -1, paused = false;
  let disposed = false, failed = false, visible = true, frame = 0, last = 0, elapsed = 0;
  let dragging: { id: number; x: number; y: number } | null = null;
  let gazeX = 0, gazeY = 0, bank = 0, mapBlend = mode === 'overview' ? 1 : 0;
  let transition = 1, initialized = false, notified: number | null = null, launchSeconds = 0;
  let slowFrames = 0, rendered = false;
  const fromPosition = new THREE.Vector3(), fromRotation = new THREE.Quaternion();
  const mapPosition = new THREE.Vector3(), mapRotation = new THREE.Quaternion();
  const desiredPosition = new THREE.Vector3(), desiredRotation = new THREE.Quaternion();
  const target = new THREE.Vector3(), projected = new THREE.Vector3();
  const basis = new THREE.Matrix4(), look = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const up = new THREE.Vector3(0, 1, 0);
  let fromFov = 70;

  function resetInput() { keys.clear(); dragging = null; get().input.current = { x: 0, y: 0 }; }
  function focus() { host.focus({ preventScroll: true }); }
  function mapCamera() {
    // Fit the complete projection, including its outer calibration ring, in portrait too.
    const distance = 122 / (Math.tan(THREE.MathUtils.degToRad(44 / 2)) * Math.min(camera.aspect, 1)) * 1.08;
    mapPosition.set(.42, .25, 1.12).normalize().multiplyScalar(distance).add(orbit.target);
    basis.lookAt(mapPosition, orbit.target, up); mapRotation.setFromRotationMatrix(basis);
    orbit.minDistance = distance * .5; orbit.maxDistance = distance * 1.5;
  }
  function size() {
    const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false); composer.setSize(width, height);
    scenery.particleMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    camera.aspect = width / height; camera.updateProjectionMatrix(); mapCamera();
    if (mode === 'overview' && transition >= 1) { camera.position.copy(mapPosition); camera.quaternion.copy(mapRotation); orbit.update(); }
  }
  function beginTransition() {
    fromPosition.copy(camera.position); fromRotation.copy(camera.quaternion); fromFov = camera.fov;
    transition = get().reduced ? 1 : 0;
    orbit.enabled = false; orbit.autoRotate = false;
    resetInput(); gazeX = gazeY = 0;
    if (mode === 'overview') mapCamera();
  }
  function nearest() {
    let index = -1, distance = Infinity;
    stops.forEach((stop, i) => { const d = Math.abs(stop - motion.distance); if (d < distance) { index = i; distance = d; } });
    return { index, distance };
  }
  function openStation(index: number) {
    notified = index; journey = { ...journey, phase: 'stopped', station: index, motion: { ...motion, speed: 0, acceleration: 0 } }; motion = journey.motion; launchSeconds = 0;
    resetInput(); get().onArrive(index);
  }
  const keydown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || get().paused || get().mode !== 'explore') return;
    if (controlled.has(event.code)) { event.preventDefault(); keys.add(event.code); }
    if (event.code === 'KeyE' && !event.repeat) { const near = nearest(); if (near.index >= 0 && near.distance < 3.8 && Math.abs(motion.speed) < .12) { event.preventDefault(); openStation(near.index); } }
  };
  const keyup = (event: KeyboardEvent) => keys.delete(event.code);
  const pointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || get().mode !== 'explore' || get().paused) return;
    focus(); dragging = { id: event.pointerId, x: event.clientX, y: event.clientY }; renderer.domElement.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== dragging.id || get().paused) return;
    gazeX = THREE.MathUtils.clamp(gazeX - (event.clientX - dragging.x) * .003, -1.05, 1.05);
    gazeY = THREE.MathUtils.clamp(gazeY - (event.clientY - dragging.y) * .0025, -.6, .6);
    dragging.x = event.clientX; dragging.y = event.clientY;
  };
  const pointerUp = () => { dragging = null; };
  const contextLost = (event: Event) => { event.preventDefault(); failed = true; cancelAnimationFrame(frame); get().onError(); };
  function visibility() {
    resetInput(); launchSeconds = 0; last = 0; cancelAnimationFrame(frame);
    if (!document.hidden && visible && !disposed && !failed) frame = requestAnimationFrame(animate);
  }
  function animate(now: number) {
    if (disposed || failed || document.hidden || !visible) return;
    const rawDelta = last ? (now - last) / 1000 : 0;
    const dt = Math.min(rawDelta, .05); last = now;
    const props = get();
    if (!props.paused) elapsed += dt;
    if (command !== props.command.serial) {
      command = props.command.serial;
      const destination = props.command.station;
      if (props.command.resume) { journey = departCoasterStation(journey); launchSeconds = 2.5; }
      else { journey = initialCoasterJourney(destination === null ? 0 : stops[destination] ?? 0); journey.dismissed = destination; launchSeconds = destination === null ? 0 : 2.5; }
      motion = journey.motion; notified = null; bank = 0; resetInput();
      if (mode === 'explore') focus();
    }
    if (mode !== props.mode) { mode = props.mode; beginTransition(); if (mode === 'explore') focus(); }
    if (paused !== props.paused) { paused = props.paused; resetInput(); if (!paused && mode === 'explore') { journey = departCoasterStation(journey); notified = null; focus(); } }
    const active = mode === 'explore' && !paused && transition >= 1 && controlsRoot.contains(document.activeElement);
    const keyboard = Number(keys.has('KeyW') || keys.has('KeyD') || keys.has('ArrowUp') || keys.has('ArrowRight')) - Number(keys.has('KeyS') || keys.has('KeyA') || keys.has('ArrowDown') || keys.has('ArrowLeft'));
    const stick = props.input.current;
    let throttle = keys.size ? keyboard : Math.abs(stick.y) >= Math.abs(stick.x) ? stick.y : stick.x;
    if (keys.size || throttle) launchSeconds = 0;
    else if (launchSeconds > 0 && active) { throttle = 1; launchSeconds = Math.max(0, launchSeconds - dt); }
    if (active) {
      const current = sampleTrack(track, motion.distance, length);
      journey = stepCoasterJourney(journey, throttle, current.tangent.y, dt, length, stopDefinitions, props.reduced);
      motion = journey.motion;
      if (journey.phase === 'stopped' && journey.station !== null && notified !== journey.station) openStation(journey.station);
    }
    const f = sampleTrack(track, motion.distance, length);
    bank = THREE.MathUtils.damp(bank, cameraBank(f.curvature, motion.speed, props.reduced), 4.5, dt);
    if (!dragging) { gazeX = THREE.MathUtils.damp(gazeX, 0, 1.6, dt); gazeY = THREE.MathUtils.damp(gazeY, 0, 1.6, dt); }
    target.copy(f.point).add(f.tangent);
    basis.lookAt(f.point, target, f.up); desiredRotation.setFromRotationMatrix(basis);
    look.setFromEuler(euler.set(0, 0, bank)); desiredRotation.multiply(look);
    scenery.cart.position.copy(f.point); scenery.cart.quaternion.copy(desiredRotation);
    scenery.player.position.copy(f.point).addScaledVector(f.up, 1);
    desiredPosition.copy(f.point).addScaledVector(f.up, 1.48);
    look.setFromEuler(euler.set(gazeY, gazeX, 0)); desiredRotation.multiply(look);
    const rideFov = (camera.aspect < .8 ? 77 : 68) + (props.reduced ? 0 : Math.abs(motion.speed) / COASTER_SPEED * 8);
    if (!initialized) {
      initialized = true; camera.position.copy(desiredPosition); camera.quaternion.copy(desiredRotation); camera.fov = rideFov;
      if (mode === 'overview') { camera.position.copy(mapPosition); camera.quaternion.copy(mapRotation); camera.fov = 44; }
    }
    if (transition < 1) {
      transition = Math.min(1, transition + dt / 1.35);
      const t = THREE.MathUtils.smootherstep(transition, 0, 1);
      camera.position.lerpVectors(fromPosition, mode === 'overview' ? mapPosition : desiredPosition, t);
      camera.quaternion.slerpQuaternions(fromRotation, mode === 'overview' ? mapRotation : desiredRotation, t);
      camera.fov = THREE.MathUtils.lerp(fromFov, mode === 'overview' ? 44 : rideFov, t);
    } else if (mode === 'explore') {
      camera.position.copy(desiredPosition);
      camera.quaternion.slerp(desiredRotation, props.reduced ? 1 : 1 - Math.exp(-8 * dt));
      camera.fov = THREE.MathUtils.damp(camera.fov, rideFov, 3, dt);
    } else {
      if (!orbit.enabled) { camera.position.copy(mapPosition); camera.quaternion.copy(mapRotation); camera.fov = 44; }
      orbit.enabled = !paused;
      orbit.autoRotate = !props.reduced && !paused;
      if (!paused) orbit.update(dt);
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    mapBlend = props.reduced ? (mode === 'overview' ? 1 : 0) : THREE.MathUtils.damp(mapBlend, mode === 'overview' ? 1 : 0, 3, dt);
    scenery.update(elapsed, props.reduced, mapBlend);
    (scene.fog as THREE.FogExp2).density = THREE.MathUtils.lerp(.0045, .0008, mapBlend);
    markers.forEach((marker, i) => {
      const show = mode === 'overview' && transition >= 1 && !paused;
      if (show) {
        projected.copy(stopPoints[i]).project(camera);
        marker.style.left = `${(projected.x * .5 + .5) * host.clientWidth}px`;
        marker.style.top = `${(-projected.y * .5 + .5) * host.clientHeight}px`;
      }
      marker.style.visibility = !show || projected.z > 1 || projected.z < -1 || Math.abs(projected.x) > .95 || Math.abs(projected.y) > .94 ? 'hidden' : 'visible';
    });
    // Reduce render resolution once on sustained slow devices, without dropping scene detail.
    if (rawDelta > .035 && rawDelta < .2) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 100 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); composer.setPixelRatio(1); size(); slowFrames = 0; }
    try { composer.render(); }
    catch (error) { failed = true; console.error('Unable to render the Nucleus ride:', error); props.onError(); return; }
    if (!rendered) { rendered = true; props.onReady(); }
    frame = requestAnimationFrame(animate);
  }

  const resize = new ResizeObserver(size); resize.observe(host);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibility(); }); intersection.observe(host);
  controlsRoot.addEventListener('keydown', keydown); host.addEventListener('focusout', resetInput);
  window.addEventListener('keyup', keyup); window.addEventListener('blur', resetInput);
  document.addEventListener('visibilitychange', visibility);
  renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerup', pointerUp); renderer.domElement.addEventListener('pointercancel', pointerUp);
  renderer.domElement.addEventListener('lostpointercapture', pointerUp); renderer.domElement.addEventListener('webglcontextlost', contextLost);
  size(); frame = requestAnimationFrame(animate);
  return () => {
    disposed = true; cancelAnimationFrame(frame); resetInput(); resize.disconnect(); intersection.disconnect(); orbit.dispose();
    controlsRoot.removeEventListener('keydown', keydown); host.removeEventListener('focusout', resetInput);
    window.removeEventListener('keyup', keyup); window.removeEventListener('blur', resetInput); document.removeEventListener('visibilitychange', visibility);
    renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointermove', pointerMove);
    renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('pointercancel', pointerUp);
    renderer.domElement.removeEventListener('lostpointercapture', pointerUp); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material));
    });
    const textures = new Set<THREE.Texture>();
    materials.forEach(material => { Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); }); material.dispose(); });
    geometries.forEach(geometry => geometry.dispose()); textures.forEach(texture => texture.dispose());
    bloom.dispose(); output.dispose(); renderPass.dispose(); composer.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  };
}
