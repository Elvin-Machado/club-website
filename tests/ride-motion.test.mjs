import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceRide, distanceToStation } from '../src/lib/ride-motion.ts';

test('the ride pauses without losing its place and resumes toward the same station', () => {
  const first = advanceRide(0.1, distanceToStation(0.1, 0.4), 1, true);
  const paused = advanceRide(first.position, first.remaining, 30, false);
  assert.deepEqual(paused, first);
  const resumed = advanceRide(paused.position, paused.remaining, 1, true);
  assert.ok(resumed.position > paused.position); assert.ok(resumed.remaining < paused.remaining);
});
test('the ride wraps the track and stops at its station without overshooting', () => {
  let current = { position: 0.95, remaining: distanceToStation(0.95, 0.07), arrived: false };
  for (let i = 0; i < 500 && !current.arrived; i++) current = advanceRide(current.position, current.remaining, 0.016, true);
  assert.equal(current.arrived, true); assert.ok(Math.abs(current.position - 0.07) < 1e-9); assert.equal(current.remaining, 0);
});
test('a single-station experience can make a full lap', () => {
  assert.equal(distanceToStation(0.07, 0.07), 1);
  const completed = advanceRide(0.07, 1, 40, true);
  assert.equal(completed.arrived, true); assert.ok(Math.abs(completed.position - 0.07) < 1e-9);
});
