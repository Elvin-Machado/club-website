import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, SPAWN, WALK_SPEED, createStations, isWalkable, movePlayer, updateArrival } from '../src/lib/event-navigation.ts';

const events = count => Array.from({ length: count }, (_, i) => ({ id: `event-${i}`, title: `Workshop ${i + 1}`, published: true }));

test('every event gets a unique walkable station, including more than five events', () => {
  for (const count of [1, 3, 5, 6, 12, 30, 100]) {
    const stations = createStations(events(count));
    assert.equal(stations.length, count);
    assert.equal(new Set(stations.map(s => `${s.position.x},${s.position.z}`)).size, count);
    stations.forEach(s => {
      assert.ok(isWalkable(s.position.x, s.position.z), `Station ${s.id} is inside a wall`);
      assert.equal(s.event.id, s.id);
      assert.ok(s.radius > 0);
    });
  }
});

test('empty content shows templates, drafts stay hidden, and publication creates another stop', () => {
  assert.equal(createStations([]).length, 5);
  assert.ok(createStations([]).every(s => s.event === null));
  const existing = events(5), draft = { id: 'new', title: 'New event', published: false };
  assert.equal(createStations([...existing, draft]).length, 5);
  assert.equal(createStations([...existing, { ...draft, published: true }]).length, 6);
});

test('the tail, every room and automatically placed station are connected by walkable floor', () => {
  const start = [Math.round(SPAWN.x / WORLD.unit + WORLD.width / 2), Math.round(SPAWN.z / WORLD.unit + WORLD.height / 2)];
  const queue = [start], seen = new Set([start.join(',')]);
  for (let head = 0; head < queue.length; head++) {
    const [x, z] = queue[head];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, zz = z + dz, key = `${xx},${zz}`;
      if (!seen.has(key) && isWalkable((xx - WORLD.width / 2) * WORLD.unit, (zz - WORLD.height / 2) * WORLD.unit)) {
        seen.add(key); queue.push([xx, zz]);
      }
    }
  }
  for (const count of [0, 12, 100]) for (const s of createStations(events(count))) {
    const key = `${Math.round(s.position.x / WORLD.unit + WORLD.width / 2)},${Math.round(s.position.z / WORLD.unit + WORLD.height / 2)}`;
    assert.ok(seen.has(key), `Station ${s.number} is unreachable from the tail (${count} events)`);
  }
});

test('the player can follow the entire gold path without getting stuck on a doorway', () => {
  let position = { ...SPAWN };
  for (const [x, z] of WORLD.route.slice(1)) {
    let steps = 0;
    while (Math.hypot(position.x - x, position.z - z) > 0.07 && steps++ < 1500) {
      const distance = Math.hypot(position.x - x, position.z - z);
      const yaw = Math.atan2(position.x - x, position.z - z);
      position = movePlayer(position, { x: 0, y: 1 }, yaw, Math.min(1 / 60, distance / WALK_SPEED));
    }
    assert.ok(steps < 1500, `Blocked on the way to ${x}, ${z}`);
  }
});

test('movement stays inside the shell and diagonal speed is normalized', () => {
  const position = createStations([])[0].position;
  const straight = movePlayer(position, { x: 0, y: 1 }, 0, 0.02);
  const diagonal = movePlayer(position, { x: 1, y: 1 }, 0, 0.02);
  assert.ok(Math.abs(Math.hypot(straight.x - position.x, straight.z - position.z) - Math.hypot(diagonal.x - position.x, diagonal.z - position.z)) < 1e-6);
  let p = { ...SPAWN };
  for (let i = 0; i < 1000; i++) {
    p = movePlayer(p, { x: 1, y: -1 }, i * 0.03, 2);
    assert.ok(isWalkable(p.x, p.z));
  }
});

test('stations open only after stopping and stay dismissed until the player leaves', () => {
  const stations = createStations([]), position = stations[0].position;
  let state = { candidate: null, stillFor: 0, dismissed: null };
  for (let i = 0; i < 50; i++) state = updateArrival(state, position, true, 0.1, stations);
  assert.equal(state.arrived, null);
  for (let i = 0; i < 7; i++) state = updateArrival(state, position, false, 0.1, stations);
  assert.equal(state.arrived, 0);
  state = { ...state, dismissed: 0, stillFor: 0 };
  for (let i = 0; i < 30; i++) state = updateArrival(state, position, false, 0.1, stations);
  assert.equal(state.arrived, null);
  state = updateArrival(state, SPAWN, true, 0.1, stations);
  for (let i = 0; i < 7; i++) state = updateArrival(state, position, false, 0.1, stations);
  assert.equal(state.arrived, 0);
});
