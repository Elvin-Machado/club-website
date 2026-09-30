import test from 'node:test';
import assert from 'node:assert/strict';
import { cinematicCamera, glimpseFrame, GLIMPSE_INTERVAL, GLIMPSE_LIFETIME, GLIMPSE_SLOTS, GLIMPSE_EXIT, GLIMPSE_FADE_IN, GLIMPSE_ENLARGE, GLIMPSE_HOLD, GLIMPSE_FADE_OUT } from '../src/lib/event-cinematics.ts';

test('photos repeat in order with at most one visible throughout long journeys', () => {
  const shown = [];
  for (let tick = 0; tick < 120 * 120; tick++) {
    const elapsed = tick / 120;
    const frames = Array.from({ length: GLIMPSE_SLOTS }, (_, slot) => glimpseFrame(elapsed, slot, 500));
    const visible = frames.filter(frame => frame.opacity > 0);
    assert.ok(visible.length <= 1, `overlapping photos at ${elapsed}`);
    if (visible.length && shown.at(-1) !== visible[0].photoIndex) shown.push(visible[0].photoIndex);
    for (const frame of frames) { assert.ok(Object.values(frame).every(Number.isFinite)); assert.ok(frame.opacity >= 0 && frame.opacity <= 1); }
  }
  assert.ok(shown.length > GLIMPSE_SLOTS * 2, 'photos continue after all layers have been reused');
  assert.deepEqual(shown, Array.from({ length: shown.length }, (_, i) => i));
});

test('every handoff has a fully transparent gap, including the layer-cycle boundary', () => {
  for (let index = 0; index < GLIMPSE_SLOTS * 3; index++) {
    const start = index * GLIMPSE_INTERVAL;
    const slot = index % GLIMPSE_SLOTS;
    assert.ok(glimpseFrame(start + GLIMPSE_LIFETIME - .01, slot, 500).opacity > 0);
    for (const elapsed of [start + GLIMPSE_LIFETIME + .001, start + (GLIMPSE_LIFETIME + GLIMPSE_INTERVAL) / 2, start + GLIMPSE_INTERVAL - .001]) {
      for (let layer = 0; layer < GLIMPSE_SLOTS; layer++) assert.equal(glimpseFrame(elapsed, layer, 500).opacity, 0);
    }
    const next = glimpseFrame(start + GLIMPSE_INTERVAL + .01, (slot + 1) % GLIMPSE_SLOTS, 500);
    assert.equal(next.photoIndex, index + 1);
    assert.ok(next.opacity > 0);
  }
});

test('photos preload only while hidden and clear before docking', () => {
  for (let slot = 0; slot < GLIMPSE_SLOTS; slot++) {
    const start = slot * GLIMPSE_INTERVAL;
    const before = glimpseFrame(start + GLIMPSE_LIFETIME - .01, slot, 500);
    const prepared = glimpseFrame(start + GLIMPSE_LIFETIME + .01, slot, 500);
    assert.equal(before.photoIndex, slot);
    assert.equal(prepared.photoIndex, slot + GLIMPSE_SLOTS);
    assert.equal(prepared.opacity, 0);
    assert.equal(glimpseFrame(start + GLIMPSE_INTERVAL * GLIMPSE_SLOTS + 2, slot, 500).photoIndex, prepared.photoIndex);
    assert.equal(glimpseFrame(start + 2, slot, GLIMPSE_EXIT).opacity, 0);
    assert.equal(glimpseFrame(start + 2, slot, GLIMPSE_EXIT - 1).opacity, 0);
    assert.equal(glimpseFrame(start + 2, slot, GLIMPSE_EXIT + 6).opacity, .5);
  }
});

test('each photo fades in, enlarges slowly, holds at full opacity, then fades in place', () => {
  const entering = glimpseFrame(.5, 0, 500), revealed = glimpseFrame(GLIMPSE_FADE_IN, 0, 500);
  assert.ok(entering.opacity > 0 && entering.opacity < .5);
  assert.equal(revealed.opacity, 1);
  assert.equal(entering.scale, revealed.scale);
  const peakAt = GLIMPSE_FADE_IN + GLIMPSE_ENLARGE;
  let previousScale = revealed.scale;
  for (let elapsed = GLIMPSE_FADE_IN; elapsed <= peakAt; elapsed += .01) {
    const frame = glimpseFrame(elapsed, 0, 500);
    assert.equal(frame.opacity, 1);
    assert.ok(frame.scale >= previousScale && frame.scale <= 1.25);
    previousScale = frame.scale;
  }
  const peak = glimpseFrame(peakAt, 0, 500);
  const held = glimpseFrame(peakAt + GLIMPSE_HOLD / 2, 0, 500);
  const fading = glimpseFrame(GLIMPSE_LIFETIME - GLIMPSE_FADE_OUT / 2, 0, 500);
  const leaving = glimpseFrame(GLIMPSE_LIFETIME - .1, 0, 500);
  assert.equal(peak.opacity, 1); assert.equal(held.opacity, 1);
  assert.ok(fading.opacity > .4 && fading.opacity < .6);
  assert.ok(leaving.opacity > 0 && leaving.opacity < .1);
  assert.equal(peak.scale, 1.25);
  assert.equal(held.scale, peak.scale); assert.equal(fading.scale, peak.scale); assert.equal(leaving.scale, peak.scale);
});

test('camera widens with speed, limits impulses, and removes added motion when reduced', () => {
  const parked = cinematicCamera(0, 0, 0, 23, false, false);
  const fast = cinematicCamera(36, 17, -.5, 23, false, false);
  const phone = cinematicCamera(36, 17, -.5, 23, true, false);
  assert.ok(fast.fov > parked.fov && fast.fov < 88);
  assert.ok(phone.bankScale < fast.bankScale);
  assert.ok(Math.abs(phone.pitch) < Math.abs(fast.pitch));
  const reduced = cinematicCamera(36, 17, -.5, 23, true, true);
  assert.equal(reduced.fov, 77); assert.equal(reduced.pitch, 0); assert.equal(reduced.lift, 0);
});

test('boost focuses the view and steadies banking without changing reduced-motion framing', () => {
  for (const compact of [false, true]) {
    const normal = cinematicCamera(36, 8, -.2, 23, compact, false);
    const focused = cinematicCamera(36, 8, -.2, 23, compact, false, 1);
    const halfway = cinematicCamera(36, 8, -.2, 23, compact, false, .5);
    assert.ok(focused.fov < halfway.fov && halfway.fov < normal.fov);
    assert.ok(focused.bankScale < normal.bankScale);
    assert.deepEqual(cinematicCamera(36, 8, -.2, 23, compact, true, 1), cinematicCamera(36, 8, -.2, 23, compact, true));
  }
});
