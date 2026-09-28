import test from 'node:test';
import assert from 'node:assert/strict';
import { createRideStops, initialRideState, stepRide, departStation, BRAKE, MAX_SPEED } from '../src/lib/events-test-ride.ts';

const length = 240;
const events = count => Array.from({ length: count }, (_, i) => ({ id: `event-${i}`, title: `Event ${i}`, published: true }));
const advance = (state, input, seconds, stops = []) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) state = stepRide(state, input, 1 / 60, stops, length);
  return state;
};

test('the motor starts still, accelerates smoothly, coasts to rest and reverses', () => {
  let state = advance(initialRideState(), 0, 2);
  assert.equal(state.distance, 0);
  assert.equal(state.velocity, 0);
  state = stepRide(state, 1, 1 / 60, [], length);
  assert.ok(state.velocity > 0 && state.velocity < 0.1);
  state = advance(state, 1, 3);
  assert.equal(state.velocity, MAX_SPEED);
  const before = state.distance;
  state = advance(state, 0, 2);
  assert.equal(state.velocity, 0);
  assert.ok(state.distance > before);
  state = advance(state, -1, 3);
  assert.ok(state.velocity < 0);
  assert.ok(state.distance < before);
});

test('zones automatically brake and lock the cart until explicitly continued', () => {
  const stops = createRideStops(events(3), length);
  let state = initialRideState(), sawBrake = false, priorVelocity = 0;
  for (let frame = 0; frame < 1800 && state.phase !== 'stopped'; frame++) {
    const next = stepRide(state, 1, 1 / 60, stops, length);
    if (state.phase === 'braking') {
      sawBrake = true;
      assert.ok(Math.abs(next.velocity) <= Math.abs(priorVelocity));
      assert.ok(Math.abs(next.velocity - state.velocity) <= BRAKE / 60 + 1e-8);
    }
    state = next; priorVelocity = state.velocity;
  }
  assert.ok(sawBrake);
  assert.equal(state.phase, 'stopped');
  assert.equal(state.station, 0);
  assert.equal(state.velocity, 0);
  assert.ok(Math.abs(state.distance - stops[0].distance) <= stops[0].radius);
  assert.deepEqual(advance(state, 1, 10, stops), state, 'Holding W cannot bypass a stop');
  const departed = departStation(state);
  assert.equal(departed.dismissed, 0);
  const moving = advance(departed, 1, 2, stops);
  assert.ok(moving.distance > state.distance);
  assert.notEqual(moving.phase, 'stopped');
});

test('every event stops in both directions, including after leaving and revisiting a station', () => {
  const stops = createRideStops(events(5), length);
  let state = initialRideState();
  for (const direction of [1, -1]) {
    const arrived = [];
    for (let frame = 0; frame < 12000; frame++) {
      state = stepRide(state, direction, 1 / 60, stops, length);
      if (state.phase === 'stopped') { arrived.push(state.station); state = departStation(state); }
      if (direction === 1 && state.distance === length || direction === -1 && state.distance === 0) break;
    }
    assert.deepEqual(arrived, direction === 1 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0]);
  }
});

test('throttle changes cannot cancel braking, even when approaching in reverse', () => {
  const stops = createRideStops(events(1), length);
  let state = { ...initialRideState(), distance: 145 };
  for (let frame = 0; frame < 1000 && state.phase !== 'braking'; frame++) state = stepRide(state, -1, 1 / 60, stops, length);
  assert.equal(state.phase, 'braking');
  state = advance(state, 1, 3, stops);
  assert.equal(state.phase, 'stopped');
  assert.equal(state.velocity, 0);
  assert.ok(Math.abs(state.distance - stops[0].distance) <= stops[0].radius);
});

test('the cart stays on the finite track and does not jump after a long frame', () => {
  const start = advance(initialRideState(), -1, 10);
  assert.equal(start.distance, 0);
  assert.equal(start.velocity, 0);
  const end = advance(initialRideState(), 1, 40);
  assert.equal(end.distance, length);
  assert.equal(end.phase, 'end');
  const backwards = advance(end, -1, 2);
  assert.ok(backwards.distance < length);
  const moving = advance(initialRideState(), 1, 3);
  const afterSuspension = stepRide(moving, 1, 60, [], length);
  assert.ok(afterSuspension.distance - moving.distance <= MAX_SPEED * 0.05 + 1e-8);
});

test('published events get unique stops; empty lists get explicitly labelled previews', () => {
  for (const count of [1, 3, 10, 100]) {
    const stops = createRideStops([...events(count), { id: 'draft', published: false }], length);
    assert.equal(stops.length, count);
    assert.equal(new Set(stops.map(stop => stop.distance)).size, count);
    assert.ok(stops.every(stop => stop.distance > stop.radius && stop.distance + stop.radius < length));
    assert.ok(stops.every(stop => !stop.placeholder));
  }
  assert.equal(createRideStops([], length).length, 3);
  assert.ok(createRideStops([], length).every(stop => stop.placeholder && stop.event.category === 'Preview station'));
});

test('dense station spacing and reduced motion still stop inside every zone', () => {
  for (const count of [3, 30, 100]) {
    const stops = createRideStops(events(count), length);
    let state = initialRideState();
    const arrived = [];
    for (let frame = 0; frame < 70000 && state.distance < length; frame++) {
      state = stepRide(state, 1, 1 / 30, stops, length, 0.65);
      if (state.phase === 'stopped') {
        assert.ok(Math.abs(state.distance - stops[state.station].distance) <= stops[state.station].radius);
        arrived.push(state.station); state = departStation(state);
      }
    }
    assert.equal(state.distance, length);
    assert.deepEqual(arrived, Array.from({ length: count }, (_, i) => i));
  }
});

test('opposing keys and the joystick neutral position apply no motor acceleration', () => {
  const moving = advance(initialRideState(), 1, 2);
  assert.ok(stepRide(moving, 0, 1 / 60, [], length).velocity < moving.velocity);
  const full = advance(initialRideState(), 1, 3);
  const partial = advance(initialRideState(), 0.4, 3);
  assert.ok(partial.distance < full.distance && partial.velocity < full.velocity);
});
