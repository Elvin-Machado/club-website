import * as THREE from 'three';
import { sampleTrack, trackSeparation, LOGO_DEPTH, type CoasterTrack } from './event-coaster.ts';
import { BUILDING_BOUNDS, logoClearance } from './event-layout.ts';

export type TrackSupport = { start: THREE.Vector3; end: THREE.Vector3; radius: number; attachment?: number; kind: 'column' | 'beam' | 'saddle' };

function segmentInBox(a: THREE.Vector3, b: THREE.Vector3, min: THREE.Vector3, max: THREE.Vector3) {
  let enter = 0, leave = 1;
  for (const axis of ['x', 'y', 'z'] as const) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-9) { if (a[axis] < min[axis] || a[axis] > max[axis]) return false; }
    else {
      const first = (min[axis] - a[axis]) / delta, last = (max[axis] - a[axis]) / delta;
      enter = Math.max(enter, Math.min(first, last)); leave = Math.min(leave, Math.max(first, last));
      if (enter > leave) return false;
    }
  }
  return true;
}

/** Continuous rods are checked against overlapping rider volumes along ALL rails. */
export function createRideEnvelope(track: CoasterTrack, spacing = .9) {
  const length = track.getLength(), count = Math.ceil(length / spacing), step = length / count;
  const samples = Array.from({ length: count }, (_, i) => ({ distance: i * step, ...sampleTrack(track, i * step, length) }));
  const localA = new THREE.Vector3(), localB = new THREE.Vector3(), delta = new THREE.Vector3();
  const min = new THREE.Vector3(), max = new THREE.Vector3(), bounds = new THREE.Box3();
  function intersects(start: THREE.Vector3, end: THREE.Vector3, radius: number, attachment?: number) {
    bounds.setFromPoints([start, end]).expandByScalar(radius + 4);
    min.set(-1.4 - radius, -.5 - radius, -step - radius);
    max.set(1.4 + radius, 2.85 + radius, step + radius);
    for (const f of samples) {
      if (!bounds.containsPoint(f.point)) continue;
      // Only a short saddle may touch its own underslung spine. It still has
      // to clear every other pass, including passes across the loop seam.
      if (attachment !== undefined && trackSeparation(f.distance, attachment, length) < 4) continue;
      delta.copy(start).sub(f.point); localA.set(delta.dot(f.side), delta.dot(f.up), delta.dot(f.tangent));
      delta.copy(end).sub(f.point); localB.set(delta.dot(f.side), delta.dot(f.up), delta.dot(f.tangent));
      if (segmentInBox(localA, localB, min, max)) return true;
    }
    return false;
  }
  return { intersects };
}

export function createTrackSupports(track: CoasterTrack) {
  const length = track.getLength(), envelope = createRideEnvelope(track), supports: TrackSupport[] = [];
  const probe = new THREE.Vector3(), bounds = new THREE.Box3();
  function clear(part: TrackSupport) {
    if (envelope.intersects(part.start, part.end, part.radius + .06, part.attachment)) return false;
    bounds.setFromPoints([part.start, part.end]).expandByScalar(part.radius + .1);
    if (BUILDING_BOUNDS.some(building => building.intersectsBox(bounds))) return false;
    if (bounds.min.z > LOGO_DEPTH / 2 || bounds.max.z < -LOGO_DEPTH / 2) return true;
    const samples = Math.ceil(part.start.distanceTo(part.end) / 1.5);
    for (let i = 0; i <= samples; i++) {
      probe.lerpVectors(part.start, part.end, i / Math.max(1, samples));
      if (logoClearance(probe) < part.radius + .85) return false;
    }
    return true;
  }
  for (let distance = 12; distance < length; distance += 32) {
    const f = sampleTrack(track, distance, length), underside = f.point.clone().addScaledVector(f.up, -1.05);
    const saddle: TrackSupport = { start: underside, end: f.point.clone().addScaledVector(f.up, -.54), radius: .1, attachment: distance, kind: 'saddle' };
    if (!clear(saddle)) continue;
    for (const offset of [3.2, 4.4, 5.6]) {
      const assembly: TrackSupport[] = [];
      for (const side of [-1, 1]) {
        const top = underside.clone().addScaledVector(f.side, side * offset), foot = new THREE.Vector3(top.x, -2.8, top.z);
        const column: TrackSupport = { start: foot, end: top, radius: .19, kind: 'column' };
        const beam: TrackSupport = { start: top, end: underside, radius: .13, kind: 'beam' };
        if (clear(column) && clear(beam)) assembly.push(column, beam);
      }
      if (assembly.length) { supports.push(...assembly, saddle); break; }
    }
  }
  return supports;
}
