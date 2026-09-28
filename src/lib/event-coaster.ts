import * as THREE from 'three';

export const LOGO_SCALE = 2.4;
export const LOGO_CENTER_Y = 55;
export const LOGO_DEPTH = 5;
export const COASTER_SPEED = 15;
const UP = new THREE.Vector3(0, 1, 0);

/** The source drawing's downward Z axis becomes vertical, upward Y. */
export function logoPoint(x: number, z: number, depth = 0) {
  return new THREE.Vector3(x * LOGO_SCALE, LOGO_CENTER_Y - z * LOGO_SCALE, depth);
}

// These points sit in the negative space of the actual traced logo. Each pass
// has three collinear controls, keeping both rails clear of the sculpture.
export const LOGO_PASSAGES = [
  [-12.048, 4.125], [-6.548, -14.994], [3.143, -12.113],
  [12.048, -1.637], [-0.262, -3.863], [-3.143, 9.756],
] as const;
export const PLATFORM_POINTS = [
  [-48, 61, -38], [3, 103, 40], [36, 77, -38],
  [18, 43, -43], [-19, 66, 51], [26, 16, 48],
] as const;

/** A long, continuous tour of the front, back, crown, and lower logo openings. */
export function createCoasterTrack() {
  const point = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const pass = (index: number, direction: number) => {
    const [x, z] = LOGO_PASSAGES[index];
    return [-18, 0, 18].map(depth => logoPoint(x, z, depth * direction));
  };
  const points = [
    point(0, 8, 76), point(0, 8, 64), point(-10, 15, 48), point(-24, 30, 34),
    ...pass(0, -1), point(-39, 61, -38), point(...PLATFORM_POINTS[0]), point(-57, 61, -38),
    point(-62, 75, -30), point(-45, 88, -33), point(-28, 91, -29),
    ...pass(1, 1), point(-8, 103, 40), point(...PLATFORM_POINTS[1]), point(14, 103, 40),
    point(41, 101, 40), point(57, 93, 28), point(52, 83, 6), point(33, 80, 4), point(17, 83, 26),
    ...pass(2, -1), point(27, 77, -38), point(...PLATFORM_POINTS[2]), point(45, 77, -38),
    point(65, 65, -29), point(71, 51, -4), point(59, 46, 24), point(40, 52, 34),
    ...pass(3, -1), point(29, 43, -43), point(...PLATFORM_POINTS[3]), point(7, 43, -43),
    point(-20, 48, -49), point(-15, 60, -30),
    ...pass(4, 1), point(6, 72, 37), point(-8, 66, 51), point(...PLATFORM_POINTS[4]), point(-30, 66, 51),
    point(-54, 51, 44), point(-69, 32, 20), point(-62, 20, -17), point(-28, 27, -37),
    ...pass(5, 1), point(8, 21, 35), point(15, 16, 48), point(...PLATFORM_POINTS[5]), point(37, 16, 48),
    point(54, 12, 66), point(35, 8, 90), point(9, 8, 94), point(0, 8, 87),
  ];
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  curve.arcLengthDivisions = 9000;
  curve.updateArcLengths();
  return curve;
}

export type CoasterTrack = ReturnType<typeof createCoasterTrack>;
export type CoasterMotion = { distance: number; speed: number; acceleration: number };

export function sampleTrack(track: CoasterTrack, distance: number, length = track.getLength()) {
  const t = THREE.MathUtils.clamp(distance / length, 0, 1);
  const point = track.getPointAt(t);
  const tangent = track.getTangentAt(t).normalize();
  const side = new THREE.Vector3().crossVectors(tangent, UP).normalize();
  const up = new THREE.Vector3().crossVectors(side, tangent).normalize();
  const before = track.getTangentAt(Math.max(0, t - 0.004));
  const after = track.getTangentAt(Math.min(1, t + 0.004));
  const span = (Math.min(1, t + 0.004) - Math.max(0, t - 0.004)) * length;
  const curvature = Math.atan2(before.z * after.x - before.x * after.z, before.x * after.x + before.z * after.z) / span;
  return { point, tangent, side, up, curvature };
}

export function cameraBank(curvature: number, speed: number, reduced: boolean) {
  return reduced ? 0 : THREE.MathUtils.clamp(Math.atan(curvature * speed * speed / 22), -0.3, 0.3);
}

/** A damped motor, gravity, and rolling resistance; releasing the control coasts. */
export function stepCoaster(previous: CoasterMotion, throttle: number, slope: number, seconds: number, length: number, reduced = false): CoasterMotion {
  if (!Number.isFinite(seconds) || seconds <= 0 || length <= 0) return previous;
  const dt = Math.min(seconds, 0.05);
  const input = THREE.MathUtils.clamp(throttle, -1, 1);
  const limit = COASTER_SPEED * (reduced ? 0.55 : 1);
  const reversing = input * previous.speed < 0;
  const drive = input * (reversing ? 12 : 7.5);
  const rolling = Math.abs(previous.speed) > 0.025 ? Math.sign(previous.speed) * (0.65 + Math.abs(previous.speed) * 0.065) : 0;
  const gravity = Math.abs(previous.speed) > 0.08 || input !== 0 ? -slope * 6 : 0;
  let acceleration = THREE.MathUtils.damp(previous.acceleration, drive + gravity - rolling, 7, dt);
  let speed = THREE.MathUtils.clamp(previous.speed + acceleration * dt, -limit, limit);
  if (!input && (previous.speed * speed < 0 || Math.abs(speed) < 0.025)) { speed = 0; acceleration = 0; }
  const remaining = speed >= 0 ? length - previous.distance : previous.distance;
  speed = Math.sign(speed) * Math.min(Math.abs(speed), Math.sqrt(Math.max(0, 2 * 9 * remaining)));
  const distance = THREE.MathUtils.clamp(previous.distance + (previous.speed + speed) * 0.5 * dt, 0, length);
  if ((distance === length && speed >= 0 && input >= 0) || (distance === 0 && speed <= 0 && input <= 0)) { speed = 0; acceleration = 0; }
  return { distance, speed, acceleration };
}

export function stationDistance(track: CoasterTrack, x: number, z: number) {
  const destination = logoPoint(x, z);
  return distanceAtPoint(track, destination);
}

function distanceAtPoint(track: CoasterTrack, destination: THREE.Vector3) {
  let best = 0, nearest = Infinity;
  for (let i = 0; i <= 9000; i++) {
    const distance = track.getPointAt(i / 9000).distanceToSquared(destination);
    if (distance < nearest) { nearest = distance; best = i / 9000; }
  }
  return best * track.getLength();
}

export type CoasterStop = { distance: number; radius: number; name: string };
const PLATFORM_NAMES = ['West lookout', 'Above the crown', 'East observatory', 'The rear terrace', 'Connection bridge', 'Arrival gardens'];

export function createCoasterStops(track: CoasterTrack, count: number): CoasterStop[] {
  const length = track.getLength();
  const anchors = PLATFORM_POINTS.map(point => distanceAtPoint(track, new THREE.Vector3(...point)));
  const distances = Array.from({ length: count }, (_, index) => count <= anchors.length
    ? anchors[Math.round(index / Math.max(1, count - 1) * (anchors.length - 1))]
    : length * (0.1 + index / Math.max(1, count - 1) * 0.78));
  return distances.map((distance, index) => ({
    distance,
    radius: Math.min(27, ...distances.filter((_, i) => i !== index).map(other => Math.abs(other - distance) * 0.32)),
    name: PLATFORM_NAMES[Math.round(index / Math.max(1, count - 1) * (PLATFORM_NAMES.length - 1))],
  }));
}

export type CoasterJourney = {
  motion: CoasterMotion;
  phase: 'riding' | 'braking' | 'stopped';
  station: number | null;
  dismissed: number | null;
  dockingSpeed: number;
};

export function initialCoasterJourney(distance = 0): CoasterJourney {
  return { motion: { distance, speed: 0, acceleration: 0 }, phase: 'riding', station: null, dismissed: null, dockingSpeed: 0 };
}

export function departCoasterStation(state: CoasterJourney): CoasterJourney {
  return { ...state, phase: 'riding', dismissed: state.station ?? state.dismissed, station: null };
}

/** Station docking overrides the throttle and stops precisely at the platform. */
export function stepCoasterJourney(previous: CoasterJourney, throttle: number, slope: number, seconds: number, length: number, stops: CoasterStop[], reduced = false): CoasterJourney {
  if (previous.phase === 'stopped' || seconds <= 0 || !Number.isFinite(seconds)) return previous;
  const dt = Math.min(seconds, 0.05), state = { ...previous };
  if (state.dismissed !== null && Math.abs(state.motion.distance - stops[state.dismissed].distance) > stops[state.dismissed].radius * 1.15) state.dismissed = null;
  if (state.phase === 'braking' && state.station !== null) {
    const destination = stops[state.station].distance, remaining = destination - state.motion.distance;
    const direction = Math.sign(remaining), velocity = Math.abs(state.motion.speed);
    const desired = Math.min(state.dockingSpeed, Math.sqrt(2 * 5.5 * Math.abs(remaining)));
    const speed = Math.max(0, velocity + THREE.MathUtils.clamp(desired - velocity, -6 * dt, 4 * dt));
    const travel = (velocity + speed) * 0.5 * dt;
    if (Math.abs(remaining) <= Math.max(0.015, travel)) {
      state.motion = { distance: destination, speed: 0, acceleration: 0 }; state.phase = 'stopped';
    } else state.motion = { distance: state.motion.distance + direction * travel, speed: direction * speed, acceleration: direction * (speed - velocity) / dt };
    return state;
  }
  let motion = stepCoaster(state.motion, throttle, slope, dt, length, reduced);
  const zone = stops.reduce((radius, stop) => Math.min(radius, stop.radius), 27);
  const speedLimit = Math.sqrt(2 * 5.5 * zone * 0.72);
  if (Math.abs(motion.speed) > speedLimit) {
    motion = { ...motion, speed: Math.sign(motion.speed) * speedLimit };
    motion.distance = THREE.MathUtils.clamp(state.motion.distance + motion.speed * dt, 0, length);
  }
  const direction = Math.sign(motion.speed);
  const brakingDistance = Math.max(1.2, motion.speed * motion.speed / (2 * 5.5) + Math.abs(motion.speed) * dt + 0.5);
  let closest = Infinity;
  stops.forEach((stop, index) => {
    const ahead = (stop.distance - state.motion.distance) * direction;
    if (index !== state.dismissed && direction && ahead >= -0.05 && ahead <= Math.min(stop.radius, brakingDistance) && ahead < closest) {
      closest = ahead; state.station = index; state.phase = 'braking'; state.dockingSpeed = Math.max(1.2, Math.abs(motion.speed));
    }
  });
  state.motion = motion;
  return state;
}
