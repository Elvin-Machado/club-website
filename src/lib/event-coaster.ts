import * as THREE from 'three';

export const LOGO_SCALE = 2.4;
export const LOGO_CENTER_Y = 55;
export const LOGO_DEPTH = 5;
export const COASTER_SPEED = 23;
export const BOOST_SPEED = 36;
const STATION_BRAKE = 5.5;
const UP = new THREE.Vector3(0, 1, 0);

/** The source drawing's downward Z axis becomes vertical, upward Y. */
export function logoPoint(x: number, z: number, depth = 0) {
  return new THREE.Vector3(x * LOGO_SCALE, LOGO_CENTER_Y - z * LOGO_SCALE, depth);
}

// These points sit in the negative space of the actual traced logo. Each pass
// has three collinear controls, keeping both rails clear of the sculpture.
export const LOGO_PASSAGES = [
  [-11.348, 4.025], [-5.348, -15.894], [3.343, -10.713],
  [12.548, -2.237], [-0.362, -4.063], [-4.643, 9.956],
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
    // Stay in front of the solid crown until the next deliberate opening.
    point(41, 101, 40), point(57, 93, 28), point(52, 83, 28), point(33, 80, 35), point(17, 83, 26),
    ...pass(2, -1), point(27, 77, -38), point(...PLATFORM_POINTS[2]), point(45, 77, -38),
    point(65, 65, -29), point(71, 51, -4), point(59, 46, 24), point(40, 52, 34),
    ...pass(3, -1), point(29, 43, -43), point(...PLATFORM_POINTS[3]), point(7, 43, -43),
    point(-20, 48, -49), point(-15, 60, -30),
    ...pass(4, 1), point(6, 72, 37), point(-8, 66, 51), point(...PLATFORM_POINTS[4]), point(-30, 66, 51),
    point(-54, 51, 44), point(-69, 32, 20), point(-62, 20, -17), point(-28, 27, -37),
    ...pass(5, 1), point(8, 21, 35), point(15, 16, 48), point(...PLATFORM_POINTS[5]), point(37, 16, 48),
    // A sweeping garden return, with a straight, level join into the launch.
    point(54, 12, 66), point(67, 12, 88), point(78, 16, 113),
    point(69, 23, 143), point(38, 25, 162), point(0, 20, 169),
    point(-35, 14, 151), point(-47, 10, 124), point(-32, 8, 104),
    point(-12, 8, 113), point(0, 8, 105), point(0, 8, 92), point(0, 8, 84),
  ];
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  curve.arcLengthDivisions = 12000;
  curve.updateArcLengths();
  return curve;
}

export type CoasterTrack = ReturnType<typeof createCoasterTrack>;
export type CoasterMotion = { distance: number; speed: number; acceleration: number };
export type CoasterOptions = { loop?: boolean; boost?: boolean };
export const wrapDistance = (distance: number, length: number) => THREE.MathUtils.euclideanModulo(distance, length);
export function trackSeparation(a: number, b: number, length: number) {
  const distance = Math.abs(wrapDistance(a - b, length));
  return Math.min(distance, length - distance);
}
const aheadDistance = (from: number, to: number, direction: number, length: number, loop: boolean) =>
  loop ? wrapDistance((to - from) * direction, length) : (to - from) * direction;

export function createTrackFrame() {
  return { point: new THREE.Vector3(), tangent: new THREE.Vector3(), side: new THREE.Vector3(), up: new THREE.Vector3(), curvature: 0,
    before: new THREE.Vector3(), after: new THREE.Vector3() };
}

export function sampleTrack(track: CoasterTrack, distance: number, length = track.getLength(), frame = createTrackFrame()) {
  const t = track.closed ? wrapDistance(distance, length) / length : THREE.MathUtils.clamp(distance / length, 0, 1);
  track.getPointAt(t, frame.point);
  track.getTangentAt(t, frame.tangent).normalize();
  frame.side.crossVectors(frame.tangent, UP).normalize();
  frame.up.crossVectors(frame.side, frame.tangent).normalize();
  const before = track.getTangentAt(track.closed ? wrapDistance(t - .004, 1) : Math.max(0, t - .004), frame.before);
  const after = track.getTangentAt(track.closed ? wrapDistance(t + .004, 1) : Math.min(1, t + .004), frame.after);
  const span = (track.closed ? .008 : Math.min(1, t + .004) - Math.max(0, t - .004)) * length;
  frame.curvature = Math.atan2(before.z * after.x - before.x * after.z, before.x * after.x + before.z * after.z) / span;
  return frame;
}

export function cameraBank(curvature: number, speed: number, reduced: boolean) {
  return reduced ? 0 : THREE.MathUtils.clamp(Math.atan(curvature * speed * speed / 22), -0.3, 0.3);
}

/** A damped motor, gravity, and rolling resistance; releasing the control coasts. */
export function stepCoaster(previous: CoasterMotion, throttle: number, slope: number, seconds: number, length: number, reduced = false, options: CoasterOptions = {}): CoasterMotion {
  if (!Number.isFinite(seconds) || seconds <= 0 || length <= 0) return previous;
  const dt = Math.min(seconds, 0.05);
  const input = THREE.MathUtils.clamp(throttle, -1, 1);
  const limit = reduced ? 8.25 : options.boost ? BOOST_SPEED : COASTER_SPEED;
  const reversing = input * previous.speed < 0;
  const drive = input * (reversing ? 16 : options.boost ? 17 : 11);
  const rolling = Math.abs(previous.speed) > 0.025 ? Math.sign(previous.speed) * (0.65 + Math.abs(previous.speed) * 0.065) : 0;
  const gravity = Math.abs(previous.speed) > 0.08 || input !== 0 ? -slope * 6 : 0;
  let acceleration = THREE.MathUtils.damp(previous.acceleration, drive + gravity - rolling, 7, dt);
  // Releasing boost eases back to cruising speed instead of snapping the cart.
  const speedLimit = Math.max(limit, Math.abs(previous.speed) - 5 * dt);
  let speed = THREE.MathUtils.clamp(previous.speed + acceleration * dt, -speedLimit, speedLimit);
  if (!input && (previous.speed * speed < 0 || Math.abs(speed) < 0.025)) { speed = 0; acceleration = 0; }
  if (!options.loop) {
    const remaining = speed >= 0 ? length - previous.distance : previous.distance;
    speed = Math.sign(speed) * Math.min(Math.abs(speed), Math.sqrt(Math.max(0, 2 * 9 * remaining)));
  }
  const traveled = previous.distance + (previous.speed + speed) * .5 * dt;
  const distance = options.loop ? wrapDistance(traveled, length) : THREE.MathUtils.clamp(traveled, 0, length);
  if (!options.loop && ((distance === length && speed >= 0 && input >= 0) || (distance === 0 && speed <= 0 && input <= 0))) { speed = 0; acceleration = 0; }
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
export const APPROACH_WINDOW = 38;
export const APPROACH_FLOOR = .78;

export function nextCoasterStop(distance: number, stops: CoasterStop[], length: number, direction: number, dismissed: number | null = null, loop = true) {
  let index: number | null = null, remaining = Infinity;
  if (length <= 0 || !direction) return { index, remaining };
  stops.forEach((stop, i) => {
    if (i === dismissed || !Number.isFinite(stop.distance)) return;
    const ahead = aheadDistance(distance, stop.distance, Math.sign(direction), length, loop);
    if (ahead >= 0 && ahead < remaining) { index = i; remaining = ahead; }
  });
  return { index, remaining };
}

/** Scale simulation time, never velocity, so station braking still docks exactly. */
export function approachScale(distance: number, stops: CoasterStop[], length: number, direction: number, dismissed: number | null = null, loop = true) {
  const { remaining } = nextCoasterStop(distance, stops, length, direction, dismissed, loop);
  return THREE.MathUtils.lerp(APPROACH_FLOOR, 1, THREE.MathUtils.smoothstep(remaining, 0, APPROACH_WINDOW));
}
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
  phase: 'riding' | 'approaching' | 'braking' | 'stopped';
  station: number | null;
  dismissed: number | null;
  dockingSpeed: number;
  dockingDirection: number;
};

export function initialCoasterJourney(distance = 0): CoasterJourney {
  return { motion: { distance, speed: 0, acceleration: 0 }, phase: 'riding', station: null, dismissed: null, dockingSpeed: 0, dockingDirection: 1 };
}

export function departCoasterStation(state: CoasterJourney): CoasterJourney {
  return { ...state, phase: 'riding', dismissed: state.station ?? state.dismissed, station: null };
}

/** Station docking overrides the throttle and stops precisely at the platform. */
export function stepCoasterJourney(previous: CoasterJourney, throttle: number, slope: number, seconds: number, length: number, stops: CoasterStop[], reduced = false, options: CoasterOptions = {}): CoasterJourney {
  if (previous.phase === 'stopped' || seconds <= 0 || !Number.isFinite(seconds)) return previous;
  const dt = Math.min(seconds, 0.05), state = { ...previous };
  const loop = !!options.loop;
  if (state.dismissed !== null) {
    const stop = stops[state.dismissed];
    const separation = stop && (loop ? trackSeparation(state.motion.distance, stop.distance, length) : Math.abs(state.motion.distance - stop.distance));
    if (!stop || !Number.isFinite(stop.distance) || separation > stop.radius * 1.15) state.dismissed = null;
  }
  if (state.phase === 'braking' && state.station !== null) {
    const destination = stops[state.station].distance, direction = state.dockingDirection;
    const remaining = aheadDistance(state.motion.distance, destination, direction, length, loop), velocity = Math.abs(state.motion.speed);
    const desired = Math.min(state.dockingSpeed, Math.sqrt(2 * STATION_BRAKE * Math.max(0, remaining)));
    const speed = Math.max(0, velocity + THREE.MathUtils.clamp(desired - velocity, -6 * dt, 4 * dt));
    const travel = (velocity + speed) * 0.5 * dt;
    if (remaining <= Math.max(0.015, travel)) {
      state.motion = { distance: destination, speed: 0, acceleration: 0 }; state.phase = 'stopped';
    } else {
      const distance = state.motion.distance + direction * travel;
      state.motion = { distance: loop ? wrapDistance(distance, length) : distance, speed: direction * speed, acceleration: direction * (speed - velocity) / dt };
    }
    return state;
  }
  const motion = stepCoaster(state.motion, throttle, slope, dt, length, reduced, options);
  const direction = Math.sign(motion.speed);
  const brakingDistance = Math.max(1.2, motion.speed * motion.speed / (2 * STATION_BRAKE) + Math.abs(motion.speed) * dt + .5);
  let closest = Infinity;
  stops.forEach((stop, index) => {
    if (!Number.isFinite(stop.distance)) return;
    const ahead = aheadDistance(state.motion.distance, stop.distance, direction, length, loop);
    if (index !== state.dismissed && direction && ahead >= 0 && ahead <= brakingDistance && ahead < closest) {
      closest = ahead; state.station = index; state.phase = 'braking'; state.dockingDirection = direction; state.dockingSpeed = Math.max(1.2, Math.abs(motion.speed));
    }
  });
  // Docking takes over before integrating a frame that could pass the platform.
  if (state.phase === 'braking') return stepCoasterJourney(state, throttle, slope, dt, length, stops, reduced, options);
  state.motion = motion;
  state.phase = !reduced && nextCoasterStop(motion.distance, stops, length, direction, state.dismissed, loop).remaining < APPROACH_WINDOW ? 'approaching' : 'riding';
  return state;
}
