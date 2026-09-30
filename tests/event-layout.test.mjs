import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCoasterTrack, sampleTrack, createTrackFrame } from '../src/lib/event-coaster.ts';
import { createStationPlanner, logoClearance, BUILDING_BOUNDS, maxStopGap, fillWaypoints } from '../src/lib/event-layout.ts';
import { createExperienceStations } from '../src/lib/experience-stations.ts';
import { createQualityController, qualityPixelRatio, shouldShowJoystick } from '../src/lib/event-quality.ts';
import { createVerticalLogo } from '../src/lib/event-scenery.ts';
import { disposeObject } from '../src/lib/event-batching.ts';

const track = createCoasterTrack(), length = track.getLength(), planner = createStationPlanner(track);
test('rail, cart, and rider envelopes clear the solid logo over the entire route', () => {
  const frame = createTrackFrame();
  for (let i = 0; i <= 12000; i++) {
    const f = sampleTrack(track, i / 12000 * length, length, frame);
    assert.ok(logoClearance(f.point) > 2.5, `track clips at ${i}`);
    assert.ok(logoClearance(f.point.clone().addScaledVector(f.up, 1.5)) > 2.5, `rider clips at ${i}`);
  }
  const logo = createVerticalLogo();
  assert.ok(logo.isMesh); assert.equal(logo.children.length, 0);
  assert.equal(logo.material.transparent, false); assert.equal(logo.material.wireframe, false);
  logo.geometry.dispose(); logo.material.dispose();
});

test('three evenly spaced default stations and subsequent stations avoid structures and each other', () => {
  const stops = planner.defaults();
  assert.equal(stops.length, 3);
  const fractions = stops.map(stop => stop.distance / length);
  assert.ok(Math.abs(fractions[0] - .138) < .01 && Math.abs(fractions[1] - .472) < .01 && Math.abs(fractions[2] - .806) < .01);
  const original = stops.map(stop => stop.distance);
  while (stops.length < 50) { const next = planner.next(stops); if (!next) break; stops.push(next); }
  assert.ok(stops.length > 6); assert.ok(stops.length < 50); assert.equal(planner.next(stops), null);
  assert.deepEqual(stops.slice(0, 3).map(stop => stop.distance), original);
  for (const [index, stop] of stops.entries()) {
    assert.ok(stop.bounds.min.z > 4.5 || stop.bounds.max.z < -4.5);
    assert.ok(BUILDING_BOUNDS.every(building => !building.intersectsBox(stop.bounds)));
    assert.ok(stops.every((other, j) => j === index || !other.bounds.intersectsBox(stop.bounds)));
    assert.ok(stops.every((other, j) => j === index || Math.abs(other.distance - stop.distance) > 48));
    assert.ok(track.getPointAt(stop.distance / length).distanceTo(stop.point) < 1e-6);
  }
});

test('scenic stops fill the loop deterministically without moving events or overlapping', () => {
  const anchors = planner.defaults(), combined = planner.fillWaypoints(anchors);
  assert.ok(combined.length >= 10 && combined.length <= 12);
  assert.ok(maxStopGap(combined, length) <= 150);
  assert.deepEqual(combined, planner.fillWaypoints(anchors));
  assert.deepEqual(combined.slice(0, 3), anchors);
  for (const [i, stop] of combined.entries()) for (const other of combined.slice(i + 1)) {
    const d = Math.abs(stop.distance - other.distance);
    assert.ok(Math.min(d, length - d) > 40); assert.ok(!stop.bounds.intersectsBox(other.bounds));
  }
  assert.ok(combined.every(stop => BUILDING_BOUNDS.every(b => !b.intersectsBox(stop.bounds))));
  let previous = length;
  for (const reserve of [550, 300, 200, 150, 100]) {
    const gap = maxStopGap(planner.fillWaypoints(anchors, { reserve }), length);
    assert.ok(gap <= previous); previous = gap;
  }
  const updated = [...anchors, planner.next(anchors)], replanned = planner.fillWaypoints(updated);
  assert.deepEqual(replanned.slice(0, 4), updated);
  assert.ok(replanned.every((s, i) => replanned.every((o, j) => i === j || !s.bounds.intersectsBox(o.bounds))));
});

test('global waypoint search avoids a greedy dead end, including non-neighbour conflicts', () => {
  const placement = (distance, x = distance) => ({ distance, radius: 1, name: '', point: new THREE.Vector3(x, 0, 0), bounds: new THREE.Box3(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x + 1, 1, 1)) });
  const anchors = [placement(0)], candidates = [placement(40), placement(60), placement(80)];
  // Greedy takes 60, then neither remaining candidate clears 25 units.
  const result = fillWaypoints(anchors, candidates, 120, { reserve: 40, minSeparation: 25, maxStops: 3 });
  assert.equal(maxStopGap(result, 120), 40);
  assert.equal(result.length, 3);
  assert.ok(result.every((s, i) => result.every((o, j) => i === j || !s.bounds.intersectsBox(o.bounds))));
  const crossed = fillWaypoints(anchors, [placement(40), placement(80), placement(120, 40), placement(130), placement(160)], 200, { reserve: 60, minSeparation: 20, maxStops: 5 });
  assert.ok(maxStopGap(crossed, 200) <= 60);
  assert.ok(crossed.every((s, i) => crossed.every((o, j) => i === j || !s.bounds.intersectsBox(o.bounds))));
});

test('one or zero published events still yields three defaults; additions keep saved positions', () => {
  const event = { id: 'one', title: 'Opening', published: true };
  for (const input of [[], [event], [event, { ...event, id: 'draft', published: false }]]) assert.equal(createExperienceStations(input).length, 3);
  const initial = createExperienceStations([event]), occupied = planner.forEvents(initial.map(s => s.event));
  const next = planner.next(occupied), newEvent = { ...event, id: 'new', trackPosition: next.distance / length };
  const updated = createExperienceStations([event, newEvent]);
  assert.equal(updated.length, 4); assert.deepEqual(updated.slice(0, 3), initial);
  const saved = planner.forEvents(updated.map(s => s.event));
  assert.equal(saved[3].distance, next.distance);
  assert.deepEqual(saved.slice(0, 3).map(s => s.distance), occupied.map(s => s.distance));
});

test('retuning default anchors preserves an existing saved station in their new preferred position', () => {
  const saved = { id: 'saved-before-retuning', trackPosition: planner.defaults()[0].distance / length };
  const placements = planner.forEvents([null, null, null, saved]);
  assert.equal(placements[3].distance / length, saved.trackPosition);
  for (const [i, stop] of placements.entries()) for (const other of placements.slice(i + 1)) {
    assert.ok(!stop.bounds.intersectsBox(other.bounds));
    const d = Math.abs(stop.distance - other.distance); assert.ok(Math.min(d, length - d) > 48);
  }
});

test('removing a station retains shared resources until the owning world is disposed', () => {
  const scene = new THREE.Scene(), station = new THREE.Group(), geometry = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial();
  const signGeometry = new THREE.PlaneGeometry(), signMaterial = new THREE.MeshBasicMaterial();
  let geometries = 0, materials = 0, signs = 0;
  geometry.addEventListener('dispose', () => geometries++); material.addEventListener('dispose', () => materials++);
  signMaterial.addEventListener('dispose', () => signs++);
  scene.add(new THREE.Mesh(geometry, material), station);
  station.add(new THREE.Mesh(geometry, material), new THREE.Mesh(signGeometry, signMaterial));
  disposeObject(station, { geometries: new Set([geometry]), materials: new Set([material]) });
  assert.equal(geometries, 0); assert.equal(materials, 0); assert.equal(signs, 1); assert.equal(station.parent, null);
  disposeObject(scene); assert.equal(geometries, 1); assert.equal(materials, 1);
});

test('adaptive quality reacts before 30fps, ignores suspension, and recovers without oscillation', () => {
  const quality = createQualityController(2);
  for (let i = 0; i < 240; i++) quality.sample(1 / 40);
  assert.equal(quality.level, 0);
  for (let i = 0; i < 100; i++) quality.sample(2);
  assert.equal(quality.level, 0);
  for (let i = 0; i < 1200; i++) quality.sample(1 / 60);
  assert.ok(quality.level >= 1);
  const verySlow = createQualityController(2);
  for (let i = 0; i < 40; i++) verySlow.sample(.2);
  assert.equal(verySlow.level, 0);
  assert.ok(qualityPixelRatio(2, 3840, 2160, 3, false) ** 2 * 3840 * 2160 <= 2_200_001);
  assert.ok(qualityPixelRatio(0, 390, 844, 3, true) < 1);
  assert.equal(shouldShowJoystick(false, false, 390), false);
  assert.equal(shouldShowJoystick(true, false, 1280), false);
  assert.equal(shouldShowJoystick(true, true, 390), true);
  assert.equal(shouldShowJoystick(true, true, 1366), true);
  assert.equal(shouldShowJoystick(true, true, 1920), false);
});
