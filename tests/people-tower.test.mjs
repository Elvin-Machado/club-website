import test from 'node:test';
import assert from 'node:assert/strict';
import { towerSlots, towerFrame, memberProgress, sortTowerMembers, BLOCK_SIZE, TOWER_INTRO, TOWER_OUTRO } from '../src/lib/people-tower-motion.ts';
import { createTowerPhysics } from '../src/lib/people-tower-physics.ts';

test('every member occupies a unique block with repeatable, varied extraction paths', () => {
  const ids = Array.from({ length: 15 }, (_, i) => `member-${i}`);
  const slots = towerSlots(ids);
  assert.deepEqual(slots, towerSlots(ids));
  assert.equal(new Set(slots.map(slot => slot.position.join(','))).size, ids.length);
  assert.equal(new Set(slots.map(slot => slot.layer)).size, 5);
  assert.equal(new Set(slots.map(slot => slot.direction)).size, 2);
  assert.equal(new Set(slots.map(slot => slot.yaw)).size, 2);
  assert.ok(slots.some((slot, i) => slot.rank !== i));
});

test('new additions form full foundation layers below established leaders and partial top layers stay centered', () => {
  const members = [
    { id: 'member', role: 'Member' }, { id: 'president', role: 'President' },
    { id: 'new-officer', role: 'President', createdAt: '2026-09-30T10:00:00Z' },
    { id: 'older', role: 'Member', createdAt: '2026-09-29T10:00:00Z' },
    { id: 'newest', role: 'Member', createdAt: '2026-09-30T11:00:00Z' },
  ];
  const ordered = sortTowerMembers(members), slots = towerSlots(ordered.map(member => member.id));
  assert.deepEqual(ordered.map(member => member.id), ['president', 'member', 'older', 'new-officer', 'newest']);
  assert.equal(members[0].id, 'member', 'sorting does not mutate API data');
  assert.deepEqual(slots.map(slot => slot.layer), [1, 1, 0, 0, 0]);
  for (const count of [1, 2, 4, 5, 16, 40]) {
    const layout = towerSlots(Array.from({ length: count }, (_, i) => String(i)));
    const top = layout.filter(slot => slot.layer === Math.ceil(count / 3) - 1);
    assert.ok(Math.abs(top.reduce((sum, slot) => sum + slot.position[0] + slot.position[2], 0)) < 1e-9);
    assert.equal(layout.at(-1).layer, 0);
  }
});

function simulate(physics, seconds, dt = 1 / 60) {
  for (let i = 0; i < Math.round(seconds / dt); i++) physics.step(dt);
}
const fixtureSlots = () => towerSlots(Array.from({ length: 15 }, (_, i) => `member-${i}`));

test('mass, contact and sleep keep an untouched tower stable; removing its foundation drops every supported layer', () => {
  const slots = fixtureSlots(), physics = createTowerPhysics(slots);
  try {
    simulate(physics, 5);
    assert.equal(physics.moving(), false, 'settled tower sleeps');
    physics.bodies.forEach((body, index) => {
      assert.ok(body.mass > 0);
      assert.ok(Math.abs(body.position.y - slots[index].position[1]) < .03);
    });
    const before = physics.bodies.slice(0, 12).map(body => body.position.y);
    [12, 13, 14].forEach(index => physics.remove(index)); simulate(physics, 4);
    physics.bodies.slice(0, 12).forEach((body, index) => {
      assert.ok(before[index] - body.position.y > BLOCK_SIZE[1] * .9, 'unsupported block falls');
      assert.ok(body.position.y > physics.floorY, 'plinth catches blocks');
    });
  } finally { physics.dispose(); }
});

test('click pulls and pointer constraints move dynamic blocks, disturb neighbours, release, and rebuild cleanly', () => {
  const slots = fixtureSlots(), physics = createTowerPhysics(slots);
  try {
    simulate(physics, 3); physics.pull(14); simulate(physics, 4);
    const extracted = physics.bodies[14];
    assert.ok(Math.hypot(extracted.position.x, extracted.position.z) > 3.5);
    assert.ok(physics.bodies.slice(0, 12).some((body, index) => Math.abs(body.position.y - slots[index].position[1]) > .1));
    assert.equal(physics.world.constraints.length, 0);
    physics.reset(); simulate(physics, 3);
    const body = physics.bodies[12];
    assert.ok(physics.grab(12, body.position));
    physics.move({ x: 6, y: body.position.y, z: body.position.z }); simulate(physics, 1.5);
    assert.ok(body.position.x > 4); assert.ok(body.mass > 0);
    physics.release(); assert.equal(physics.world.constraints.length, 0);
    physics.grab(12, body.position);
    physics.move({ x: 6, y: 2, z: 0 }); simulate(physics, 4);
    const heldY = body.position.y; physics.release(); simulate(physics, 1);
    assert.ok(body.position.y < heldY - 1, 'releasing a stationary suspended block wakes gravity');
    physics.reset(4); assert.equal(physics.world.bodies.length, slots.length - 4 + 2);
    physics.reset();
    physics.bodies.forEach((item, index) => assert.deepEqual(item.position.toArray(), [...slots[index].position]));
    assert.equal(physics.world.bodies.length, slots.length + 2);
  } finally { physics.dispose(); physics.dispose(); }
  assert.equal(physics.world.bodies.length, 0); assert.equal(physics.world.constraints.length, 0);
});

test('fixed steps preserve physics across frame rates and cap work after long pauses', () => {
  const slow = createTowerPhysics(fixtureSlots()), fast = createTowerPhysics(fixtureSlots());
  try {
    simulate(slow, 2, 1 / 30); simulate(fast, 2, 1 / 120);
    slow.bodies.forEach((body, index) => assert.ok(body.position.distanceTo(fast.bodies[index].position) < .001));
    slow.grab(0, slow.bodies[0].position);
    const time = slow.world.time; slow.step(30);
    assert.ok(slow.world.time - time <= .051, 'returning from background cannot cause an unbounded catch-up');
  } finally { slow.dispose(); fast.dispose(); }
});

test('forward and reverse seeking visits every member and handles empty and changing team sizes', () => {
  for (const count of [0, 1, 2, 15, 40]) {
    assert.equal(towerSlots(Array.from({ length: count }, (_, i) => String(i))).length, count);
    assert.equal(towerFrame(0, count).index, -1);
    assert.equal(towerFrame(1, count).index, -1);
    assert.equal(towerFrame(1, count).completed, count);
    assert.ok(Math.abs(towerFrame(1, count).outro - 1) < 1e-12);
    for (let index = count - 1; index >= 0; index--) {
      const at = towerFrame(memberProgress(index, count), count);
      assert.equal(at.index, index);
      assert.ok(at.local > .43 && at.local < .76, 'jump lands in the readable hold');
      const duration = TOWER_INTRO + count + TOWER_OUTRO;
      const start = (TOWER_INTRO + index) / duration;
      assert.equal(towerFrame(start + 1e-7, count).completed, index);
      assert.equal(towerFrame(start - 1e-7, count).completed, Math.max(0, index - 1));
    }
  }
});
