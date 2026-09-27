import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraBank, createCoasterTrack, sampleTrack, stationDistance, stepCoaster, COASTER_SPEED } from '../src/lib/event-coaster.ts';
import { createStations } from '../src/lib/event-navigation.ts';

function simulate(state, throttle, seconds, fps = 60, reduced = false) {
  for (let i = 0; i < seconds * fps; i++) state = stepCoaster(state, throttle, 0, 1 / fps, 10000, reduced);
  return state;
}

test('motor carries momentum after release and brakes before reversing', () => {
  const fast = simulate({ distance: 100, speed: 0, acceleration: 0 }, 1, 3);
  assert.ok(fast.speed > 10);
  const coast = simulate(fast, 0, 1);
  assert.ok(coast.distance > fast.distance + 8);
  assert.ok(coast.speed > 7 && coast.speed < fast.speed);
  const braking = simulate(fast, -1, .5);
  assert.ok(braking.speed > 0 && braking.speed < fast.speed);
  const reverse = simulate(braking, -1, 3);
  assert.ok(reverse.speed < 0);
});

test('motor remains stable across frame rates, pauses, and track ends', () => {
  const start = { distance: 100, speed: 0, acceleration: 0 };
  const a = simulate(start, 1, 3, 30), b = simulate(start, 1, 3, 120);
  assert.ok(Math.abs(a.distance - b.distance) < .4);
  assert.ok(Math.abs(a.speed - b.speed) < .1);
  assert.deepEqual(stepCoaster(start, 1, 0, 0, 200), start);
  assert.deepEqual(stepCoaster(start, 1, 0, 300, 200), stepCoaster(start, 1, 0, .05, 200));
  let end = { distance: 98, speed: COASTER_SPEED, acceleration: 0 };
  for (let i = 0; i < 300; i++) end = stepCoaster(end, 1, 0, 1 / 60, 100);
  assert.equal(end.distance, 100); assert.equal(end.speed, 0);
  assert.ok(stepCoaster(end, -1, 0, .05, 100).speed < 0);
});

test('the track has elevation, continuous heading, and evenly sampled travel', () => {
  const track = createCoasterTrack(), length = track.getLength();
  let previous = sampleTrack(track, 0), low = Infinity, high = -Infinity;
  for (let i = 1; i <= 2000; i++) {
    const frame = sampleTrack(track, i / 2000 * length);
    assert.ok(Number.isFinite(frame.curvature));
    assert.ok(frame.tangent.dot(previous.tangent) > .96, 'no abrupt corner');
    assert.ok(Math.abs(frame.point.distanceTo(previous.point) - length / 2000) < .015);
    low = Math.min(low, frame.point.y); high = Math.max(high, frame.point.y); previous = frame;
  }
  assert.ok(low > 3.1); assert.ok(high - low > 4);
  for (const station of createStations([])) {
    const distance = stationDistance(track, station.position.x, station.position.z);
    assert.ok(distance >= 0 && distance <= length);
  }
});

test('banking follows corner direction and speed, and reduced motion removes it', () => {
  assert.equal(cameraBank(0, 15, false), 0);
  assert.ok(cameraBank(.02, 14, false) > cameraBank(.02, 4, false));
  assert.equal(cameraBank(-.02, 14, false), -cameraBank(.02, 14, false));
  assert.ok(Math.abs(cameraBank(4, 15, false)) <= .3);
  assert.equal(cameraBank(.2, 15, true), 0);
  assert.ok(simulate({ distance: 0, speed: 0, acceleration: 0 }, 1, 10, 60, true).speed <= COASTER_SPEED * .55);
});
