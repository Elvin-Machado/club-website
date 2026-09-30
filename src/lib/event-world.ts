import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { LogoWorldProps } from '../components/shared/LogoWorld';
import { cameraBank, createCoasterTrack, createTrackFrame, sampleTrack, stepCoasterJourney, initialCoasterJourney, departCoasterStation, trackSeparation, approachScale, nextCoasterStop, LOGO_CENTER_Y, COASTER_SPEED, type CoasterStop } from './event-coaster';
import { createScenery } from './event-scenery';
import { createStationPlanner } from './event-layout';
import { createQualityController, qualityPixelRatio } from './event-quality';
import { disposeObject } from './event-batching';
import { cinematicCamera, GLIMPSE_EXIT } from './event-cinematics';
import { createRideMap } from './event-minimap';

export function createEventWorld(host: HTMLDivElement, get: () => LogoWorldProps) {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !coarse, alpha: false, powerPreference: 'high-performance' });
  const quality = createQualityController(coarse || navigator.hardwareConcurrency <= 4 ? 1 : 2);
  renderer.setClearColor('#000000');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#000000', .0045);
  const camera = new THREE.PerspectiveCamera(70, 1, .15, 1800);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enabled = false; orbit.enablePan = true; orbit.screenSpacePanning = true; orbit.enableDamping = true; orbit.dampingFactor = .055;
  orbit.minPolarAngle = .15; orbit.maxPolarAngle = Math.PI * .8;
  orbit.rotateSpeed = .5; orbit.zoomSpeed = .6; orbit.autoRotateSpeed = .45;
  const mapCenter = new THREE.Vector3(0, LOGO_CENTER_Y - 5, 35);
  orbit.target.copy(mapCenter);
  scene.add(new THREE.HemisphereLight('#d3ffe2', '#082019', 1.4));
  const light = new THREE.DirectionalLight('#e1f5da', 2.3); light.position.set(-45, 105, 90); light.target.position.set(0, LOGO_CENTER_Y, 0); scene.add(light, light.target);
  const rim = new THREE.DirectionalLight('#78d5a1', 1.1); rim.position.set(50, 90, -70); rim.target.position.set(0, LOGO_CENTER_Y, 0); scene.add(rim, rim.target);
  const track = createCoasterTrack(), length = track.getLength();
  const minimap = createRideMap(track);
  const mapSamples = track.getPoints(500);
  const mapBounds = new THREE.Box3().setFromPoints(mapSamples).expandByVector(new THREE.Vector3(6, 7, 6));
  mapBounds.min.y = -3;
  const planner = createStationPlanner(track);
  let stopDefinitions: CoasterStop[] = [], stops: number[] = [];
  let travelTarget: number | null = null, travelDirection = 1, travelStops: CoasterStop[] = [];
  const scenery = createScenery(scene, track, coarse);
  let markers: HTMLButtonElement[] = [], stopPoints: (THREE.Vector3 | null)[] = [];
  let stationProps: LogoWorldProps['stations'] | null = null;
  let worldStations: LogoWorldProps['stations'] = [];
  const stationSignatures = new Map<string, string>();
  const controlsRoot = host.parentElement ?? host;
  const keys = new Set<string>();
  const heldKeys = new Set<string>();
  const controlled = new Set(['KeyW', 'KeyD', 'KeyS', 'KeyA', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  const driveOptions = { loop: true, boost: false };
  let boosting = false, boostFocus = 0;
  let journey = initialCoasterJourney(), motion = journey.motion;
  let mode = get().mode, command = -1, paused = false;
  let disposed = false, failed = false, visible = true, frame = 0, last = 0, elapsed = 0;
  let dragging: { id: number; x: number; y: number } | null = null;
  let gazeX = 0, gazeY = 0, bank = 0, mapBlend = mode === 'overview' ? 1 : 0;
  let transition = 1, initialized = false, notified: number | null = null;
  let dilation = 1, lastAnticipation = 0;
  let mapInteracted = false, cameraLift = 0, cameraPitch = 0, lastDiagnostics = 0;
  let rendered = false, width = 1, height = 1, lastMarkerUpdate = 0;
  let renderDirty = true, drewLastFrame = false, renderedFov = 0;
  const renderedPosition = new THREE.Vector3(), renderedRotation = new THREE.Quaternion();
  const rideFrame = createTrackFrame(), slopeFrame = createTrackFrame();
  const fromPosition = new THREE.Vector3(), fromRotation = new THREE.Quaternion();
  const mapPosition = new THREE.Vector3(), mapRotation = new THREE.Quaternion();
  const desiredPosition = new THREE.Vector3(), desiredRotation = new THREE.Quaternion();
  const target = new THREE.Vector3(), projected = new THREE.Vector3();
  const panOffset = new THREE.Vector3();
  const basis = new THREE.Matrix4(), look = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const up = new THREE.Vector3(0, 1, 0);
  let fromFov = 70;

  function syncStations(props: LogoWorldProps) {
    renderDirty = true;
    const previousId = journey.station === null ? null : worldStations[journey.station]?.id;
    const dismissedId = journey.dismissed === null ? null : worldStations[journey.dismissed]?.id;
    stationProps = props.stations;
    const placements = planner.forEvents(props.stations.map(station => station.event));
    worldStations = props.stations;
    stopDefinitions = placements.map(stop => stop ?? { distance: Infinity, radius: 22, name: '' });
    stops = stopDefinitions.map(stop => stop.distance);
    stopPoints = placements.map(stop => stop ? stop.point.clone().add(new THREE.Vector3(0, 5.1, 0)) : null);
    for (const id of stationSignatures.keys()) if (!worldStations.some(station => station.id === id)) { scenery.removeStation(id); stationSignatures.delete(id); }
    worldStations.forEach((station, index) => {
      const placement = placements[index];
      const signature = `${station.name}|${placement?.distance}|${index}`;
      if (stationSignatures.get(station.id) === signature) return;
      scenery.removeStation(station.id);
      if (placement) scenery.addStation(station.id, placement, index, station.name, station.kind ?? 'event');
      stationSignatures.set(station.id, signature);
    });
    markers = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-world-station]'));
    const indexOf = (id: string | null | undefined) => { const index = worldStations.findIndex(s => s.id === id); return index < 0 ? null : index; };
    journey.station = indexOf(previousId); journey.dismissed = indexOf(dismissedId);
    if (journey.station === null && journey.phase !== 'riding') journey = departCoasterStation(journey);
    notified = journey.station;
    if (travelTarget !== null) setTravel(null);
    props.onLayout?.(placements.map(Boolean), minimap.layout(placements.map(stop => stop?.point ?? null)));
  }

  function setTravel(index: number | null) {
    travelTarget = index;
    travelStops = stopDefinitions.map((stop, i) => i === index ? stop : { ...stop, distance: Infinity });
    get().onTravelChange(index);
  }
  function setBoost(active: boolean) { if (boosting !== active) { boosting = active; get().onBoostChange(active); } }
  function resetInput() { keys.clear(); dragging = null; get().input.current = { x: 0, y: 0 }; get().boostInput.current = false; setBoost(false); }
  function focus() { host.focus({ preventScroll: true }); }
  function mapCamera() {
    // Fit the longer loop, including the foreground garden, on narrow displays.
    const direction = new THREE.Vector3(.3, .45, 1).normalize();
    const right = new THREE.Vector3().crossVectors(up, direction).normalize(), vertical = new THREE.Vector3().crossVectors(direction, right);
    const tangent = Math.tan(THREE.MathUtils.degToRad(44 / 2));
    let distance = 0;
    const sideGuide = width > 900 || height < 500;
    const usableWidth = Math.max(width * .45, width - (sideGuide ? width > 900 ? 360 : 288 : 48));
    const usableHeight = Math.max(height * .48, height - (sideGuide ? 120 : 300));
    for (const point of mapSamples) {
      const corner = point.clone().sub(orbit.target);
      distance = Math.max(distance, corner.dot(direction) + 1.12 * Math.max((Math.abs(corner.dot(right)) + 7) / (tangent * camera.aspect * usableWidth / width), (Math.abs(corner.dot(vertical)) + 7) / (tangent * usableHeight / height)));
    }
    mapPosition.copy(direction).multiplyScalar(distance).add(orbit.target);
    basis.lookAt(mapPosition, orbit.target, up); mapRotation.setFromRotationMatrix(basis);
    orbit.minDistance = Math.max(160, distance * .65); orbit.maxDistance = distance * 1.4;
  }
  function frameMapView() {
    // Keep the map centred in the usable space beside/before the event guide.
    const blend = mode === 'overview' ? transition : 1 - transition;
    if (blend > 0) camera.setViewOffset(width, height, (width > 900 ? -150 : height < 500 ? -120 : 0) * blend, (width > 900 || height < 500 ? 0 : 70) * blend, width, height);
    else camera.clearViewOffset();
  }
  function size(resetCamera = true) {
    renderDirty = true;
    width = Math.max(host.clientWidth, 1); height = Math.max(host.clientHeight, 1);
    renderer.setPixelRatio(qualityPixelRatio(quality.level, width, height, window.devicePixelRatio, coarse));
    renderer.setSize(width, height, false); scenery.setQuality(quality.level);
    camera.aspect = width / height; camera.updateProjectionMatrix(); mapCamera();
    if (resetCamera && mode === 'overview' && transition >= 1) { camera.position.copy(mapPosition); camera.quaternion.copy(mapRotation); orbit.update(); }
  }
  function beginTransition() {
    fromPosition.copy(camera.position); fromRotation.copy(camera.quaternion); fromFov = camera.fov;
    transition = get().reduced ? 1 : 0;
    orbit.enabled = false; orbit.autoRotate = false;
    resetInput(); gazeX = gazeY = 0;
    if (mode === 'overview') { orbit.target.copy(mapCenter); mapInteracted = false; mapCamera(); }
  }
  function nearest() {
    let index = -1, distance = Infinity;
    stops.forEach((stop, i) => { const d = trackSeparation(stop, motion.distance, length); if (d < distance) { index = i; distance = d; } });
    return { index, distance };
  }
  function openStation(index: number) {
    notified = index; journey = { ...journey, phase: 'stopped', station: index, motion: { ...motion, speed: 0, acceleration: 0 } }; motion = journey.motion;
    resetInput(); get().onArrive(index);
  }
  const keydown = (event: KeyboardEvent) => {
    if (controlled.has(event.code) && !event.altKey && !event.ctrlKey && !event.metaKey) heldKeys.add(event.code);
    if (event.altKey || event.ctrlKey || event.metaKey || get().paused || get().mode !== 'explore') return;
    if (controlled.has(event.code)) { event.preventDefault(); keys.add(event.code); }
    if (event.code === 'KeyE' && !event.repeat) { const near = nearest(); if (near.index >= 0 && near.distance < 3.8 && Math.abs(motion.speed) < .12) { event.preventDefault(); openStation(near.index); } }
  };
  const keyup = (event: KeyboardEvent) => { keys.delete(event.code); heldKeys.delete(event.code); };
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
    heldKeys.clear(); resetInput(); last = 0; quality.reset(); cancelAnimationFrame(frame);
    if (!document.hidden && visible && !disposed && !failed) frame = requestAnimationFrame(animate);
  }
  function animate(now: number) {
    if (disposed || failed || document.hidden || !visible) return;
    const rawDelta = last ? (now - last) / 1000 : 0;
    const dt = Math.min(rawDelta, .05); last = now;
    const props = get();
    let resumeKey: string | undefined;
    if (stationProps !== props.stations) syncStations(props);
    if (!props.paused) elapsed += dt;
    if (command !== props.command.serial) {
      command = props.command.serial;
      const destination = props.command.station;
      setTravel(null);
      if (props.command.travel && destination !== null && Number.isFinite(stops[destination])) {
        const forward = THREE.MathUtils.euclideanModulo(stops[destination] - motion.distance, length);
        travelDirection = forward <= length / 2 ? 1 : -1;
        journey = departCoasterStation(journey);
        // Keep the cart where it is; drive along the rails to the chosen checkpoint.
        journey.motion = { ...motion, speed: 0, acceleration: 0 };
        journey.dismissed = null;
        setTravel(destination);
      }
      else if (props.command.resume) journey = departCoasterStation(journey);
      else { journey = initialCoasterJourney(destination === null || !Number.isFinite(stops[destination]) ? 0 : stops[destination]); journey.dismissed = destination; }
      motion = journey.motion; notified = null; bank = 0; dilation = 1; cameraLift = cameraPitch = 0; resetInput();
      resumeKey = props.command.driveKey;
      if (mode === 'explore') focus();
    }
    if (mode !== props.mode) { mode = props.mode; beginTransition(); if (mode === 'explore') focus(); }
    if (paused !== props.paused) { paused = props.paused; resetInput(); if (!paused && mode === 'explore') { if (journey.phase === 'stopped') journey = departCoasterStation(journey); notified = null; focus(); } }
    if (resumeKey && heldKeys.has(resumeKey)) keys.add(resumeKey);
    const active = mode === 'explore' && !paused && transition >= 1 && controlsRoot.contains(document.activeElement);
    const keyboard = Number(keys.has('KeyW') || keys.has('KeyD') || keys.has('ArrowUp') || keys.has('ArrowRight')) - Number(keys.has('KeyS') || keys.has('KeyA') || keys.has('ArrowDown') || keys.has('ArrowLeft'));
    const stick = props.input.current;
    const drivingKey = keys.size > Number(keys.has('ShiftLeft')) + Number(keys.has('ShiftRight'));
    let throttle = drivingKey ? keyboard : Math.abs(stick.y) >= Math.abs(stick.x) ? stick.y : stick.x;
    if (travelTarget !== null && throttle) { setTravel(null); journey = departCoasterStation(journey); }
    if (travelTarget !== null) throttle = travelDirection;
    const journeyStops = travelTarget === null ? stopDefinitions : travelStops;
    driveOptions.boost = active && (journey.phase === 'riding' || journey.phase === 'approaching') && (keys.has('ShiftLeft') || keys.has('ShiftRight') || props.boostInput.current);
    if (driveOptions.boost && !throttle && !drivingKey) throttle = Math.sign(motion.speed) || 1;
    if (active) {
      const current = sampleTrack(track, motion.distance, length, slopeFrame);
      const scale = approachScale(motion.distance, journeyStops, length, Math.sign(motion.speed) || Math.sign(throttle), journey.dismissed);
      dilation = props.reduced ? 1 : THREE.MathUtils.damp(dilation, scale, 4, dt);
      journey = stepCoasterJourney(journey, throttle, current.tangent.y, dt * dilation, length, journeyStops, props.reduced, driveOptions);
      motion = journey.motion;
      if (journey.phase === 'stopped' && journey.station !== null && notified !== journey.station) { setTravel(null); openStation(journey.station); }
    }
    setBoost(driveOptions.boost && (journey.phase === 'riding' || journey.phase === 'approaching'));
    boostFocus = props.reduced ? 0 : THREE.MathUtils.damp(boostFocus, boosting ? 1 : 0, boosting ? 3.8 : 4.5, dt);
    controlsRoot.style.setProperty('--nx-boost-focus', boostFocus.toFixed(3));
    if (now - lastAnticipation >= 250) {
      lastAnticipation = now;
      const next = nextCoasterStop(motion.distance, stopDefinitions, length, Math.sign(motion.speed), journey.dismissed);
      const anticipating = active && !props.reduced && journey.phase !== 'stopped' && next.remaining <= 90 && next.remaining >= 15;
      props.onAnticipate(anticipating ? next.index : null, next.remaining / Math.max(.1, Math.abs(motion.speed) * dilation), next.remaining);
    }
    const nextEvent = nextCoasterStop(motion.distance, stopDefinitions, length, Math.sign(motion.speed), journey.dismissed);
    const showGlimpse = active && !props.reduced && Math.abs(motion.speed) > .1 && journey.phase !== 'stopped' && nextEvent.remaining > GLIMPSE_EXIT;
    props.glimpses.current?.update(showGlimpse && nextEvent.index !== null ? worldStations[nextEvent.index] : null, nextEvent.remaining, dt);
    const f = sampleTrack(track, motion.distance, length, rideFrame);
    props.minimap.current?.update(minimap.project(f.point));
    const cinematic = cinematicCamera(motion.speed, motion.acceleration, f.tangent.y, COASTER_SPEED, coarse || camera.aspect < .8, props.reduced, boostFocus);
    bank = props.reduced ? 0 : THREE.MathUtils.damp(bank, cameraBank(f.curvature, motion.speed, false) * cinematic.bankScale, 4.5, dt);
    cameraLift = props.reduced ? 0 : THREE.MathUtils.damp(cameraLift, cinematic.lift, 4, dt);
    cameraPitch = props.reduced ? 0 : THREE.MathUtils.damp(cameraPitch, cinematic.pitch, 4, dt);
    if (!dragging) { gazeX = THREE.MathUtils.damp(gazeX, 0, 1.6 + boostFocus * 5, dt); gazeY = THREE.MathUtils.damp(gazeY, 0, 1.6 + boostFocus * 5, dt); }
    target.copy(f.point).add(f.tangent);
    basis.lookAt(f.point, target, f.up); desiredRotation.setFromRotationMatrix(basis);
    look.setFromEuler(euler.set(0, 0, bank)); desiredRotation.multiply(look);
    scenery.cart.position.copy(f.point); scenery.cart.quaternion.copy(desiredRotation);
    scenery.player.position.copy(f.point).addScaledVector(f.up, 1);
    desiredPosition.copy(f.point).addScaledVector(f.up, 1.48 + cameraLift);
    look.setFromEuler(euler.set(gazeY + cameraPitch, gazeX, 0)); desiredRotation.multiply(look);
    const rideFov = cinematic.fov - (props.reduced ? 0 : (1 - dilation) * 5);
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
      camera.fov = 44;
      orbit.enabled = !paused;
      orbit.autoRotate = !paused && !props.reduced && !mapInteracted;
      if (!paused) {
        orbit.update(dt);
        panOffset.copy(orbit.target); orbit.target.clamp(mapBounds.min, mapBounds.max);
        panOffset.sub(orbit.target); camera.position.sub(panOffset);
      }
    }
    frameMapView(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    mapBlend = props.reduced ? (mode === 'overview' ? 1 : 0) : THREE.MathUtils.damp(mapBlend, mode === 'overview' ? 1 : 0, 3, dt);
    scenery.update(elapsed, props.reduced, mapBlend, camera);
    (scene.fog as THREE.FogExp2).density = THREE.MathUtils.lerp(.0045, .0008, mapBlend);
    if (mode === 'overview' && now - lastMarkerUpdate > 50) { lastMarkerUpdate = now;
      markers = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-world-station]'));
      const depths = stopPoints.map((point, i) => ({ i, distance: point?.distanceTo(camera.position) ?? Infinity })).sort((a, b) => b.distance - a.distance);
      const ranks = new Map(depths.map((item, rank) => [item.i, rank]));
      markers.forEach((marker, i) => {
      const show = mode === 'overview' && transition >= 1 && !paused && !!stopPoints[i];
      if (show) {
        projected.copy(stopPoints[i]!).project(camera);
        const scale = THREE.MathUtils.clamp(camera.position.distanceTo(orbit.target) / stopPoints[i]!.distanceTo(camera.position), .8, 1.2);
        marker.style.transform = `translate(${(projected.x * .5 + .5) * width}px,${(-projected.y * .5 + .5) * height}px) translate(-50%,-50%) scale(${scale})`;
        marker.style.zIndex = String(ranks.get(i) ?? 0);
      }
      marker.style.visibility = !show || projected.z > 1 || projected.z < -1 || Math.abs(projected.x) > .95 || Math.abs(projected.y) > .94 ? 'hidden' : 'visible';
    }); }
    if (!paused && drewLastFrame && quality.sample(rawDelta) !== null) size(false);
    // Static idle views and open dialogs need no GPU work. Camera/scene changes
    // wake rendering without restarting the motor, transition, or orbit.
    const cameraChanged = renderedPosition.distanceToSquared(camera.position) > .000001 || renderedRotation.angleTo(camera.quaternion) > .0001 || Math.abs(renderedFov - camera.fov) > .001;
    drewLastFrame = !rendered || renderDirty || cameraChanged || transition < 1;
    try { if (drewLastFrame) { renderer.render(scene, camera); renderDirty = false; renderedPosition.copy(camera.position); renderedRotation.copy(camera.quaternion); renderedFov = camera.fov; } }
    catch (error) { failed = true; console.error('Unable to render the Nucleus ride:', error); props.onError(); return; }
    if (!rendered) { rendered = true; props.onReady(); }
    if (import.meta.env.DEV && now - lastDiagnostics > 200) {
      lastDiagnostics = now;
      host.dataset.quality = String(quality.level); host.dataset.pixelRatio = renderer.getPixelRatio().toFixed(2);
      host.dataset.drawCalls = String(renderer.info.render.calls); host.dataset.triangles = String(renderer.info.render.triangles);
      host.dataset.distance = motion.distance.toFixed(2);
      host.dataset.speed = motion.speed.toFixed(2); host.dataset.boost = String(boosting); host.dataset.trackLength = length.toFixed(2);
      host.dataset.phase = journey.phase; host.dataset.dilation = dilation.toFixed(3);
      host.dataset.travelTarget = travelTarget === null ? '' : String(travelTarget);
      host.dataset.driveReady = String(active);
      host.dataset.pan = orbit.target.toArray().map(n => n.toFixed(1)).join(',');
      host.dataset.orbit = String(orbit.autoRotate); host.dataset.fov = camera.fov.toFixed(2);
    }
    frame = requestAnimationFrame(animate);
  }

  const takeOverMap = () => { mapInteracted = true; orbit.autoRotate = false; };
  orbit.addEventListener('start', takeOverMap);
  const resize = new ResizeObserver(() => size()); resize.observe(host);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibility(); }); intersection.observe(host);
  controlsRoot.addEventListener('keydown', keydown); host.addEventListener('focusout', resetInput);
  window.addEventListener('keyup', keyup); window.addEventListener('blur', resetInput);
  document.addEventListener('visibilitychange', visibility);
  renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerup', pointerUp); renderer.domElement.addEventListener('pointercancel', pointerUp);
  renderer.domElement.addEventListener('lostpointercapture', pointerUp); renderer.domElement.addEventListener('webglcontextlost', contextLost);
  size(); frame = requestAnimationFrame(animate);
  return () => {
    disposed = true; cancelAnimationFrame(frame); resetInput(); resize.disconnect(); intersection.disconnect(); orbit.removeEventListener('start', takeOverMap); orbit.dispose();
    controlsRoot.removeEventListener('keydown', keydown); host.removeEventListener('focusout', resetInput);
    window.removeEventListener('keyup', keyup); window.removeEventListener('blur', resetInput); document.removeEventListener('visibilitychange', visibility);
    renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointermove', pointerMove);
    renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('pointercancel', pointerUp);
    renderer.domElement.removeEventListener('lostpointercapture', pointerUp); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    disposeObject(scene); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  };
}
