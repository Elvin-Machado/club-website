import * as THREE from 'three';
import { WORLD } from './event-navigation.ts';
import { LOGO_SCALE, LOGO_CENTER_Y, LOGO_DEPTH, sampleTrack, trackSeparation, wrapDistance, type CoasterTrack, type CoasterStop } from './event-coaster.ts';
import type { ClubEvent } from '../types';

function inside(x: number, y: number, polygon: number[][]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}

function edgeDistance(x: number, y: number, polygon: number[][]) {
  let distance = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], dx = b[0] - a[0], dy = b[1] - a[1];
    const t = THREE.MathUtils.clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    distance = Math.min(distance, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
  }
  return distance;
}

/** Distance to the actual extruded strokes, including empty holes. */
export function logoClearance(point: THREE.Vector3) {
  const x = point.x / LOGO_SCALE, y = (LOGO_CENTER_Y - point.y) / LOGO_SCALE;
  let planar = Infinity;
  for (const wall of WORLD.walls) {
    if (inside(x, y, wall.outline) && !wall.holes.some(hole => inside(x, y, hole))) { planar = 0; break; }
    planar = Math.min(planar, edgeDistance(x, y, wall.outline), ...wall.holes.map(hole => edgeDistance(x, y, hole)));
  }
  return Math.hypot(planar * LOGO_SCALE, Math.max(0, Math.abs(point.z) - LOGO_DEPTH / 2));
}

// Shared by collision detection and rendering, so their footprints cannot drift.
export const CITY_BLOCKS = [[-115, -70], [114, -91], [111, 78], [-114, 88]].flatMap(([x, z], block) =>
  [29, 57, 40, 22].map((height, i) => ({ x: x + (i % 2 ? 14 : -14), z: z + (i > 1 ? 18 : -18), height: height + (block * 7 + i * 3) % 17, width: 11 + (block * 3 + i * 5) % 8, depth: 12 + (block * 5 + i * 3) % 7 })));
export const BUILDING_BOUNDS = CITY_BLOCKS.map(b => new THREE.Box3(
  new THREE.Vector3(b.x - (b.width + 5) / 2, -3, b.z - (b.depth + 5) / 2),
  new THREE.Vector3(b.x + (b.width + 5) / 2, b.height + 5, b.z + (b.depth + 5) / 2)));

export type StationPlacement = CoasterStop & { bounds: THREE.Box3; point: THREE.Vector3; kind?: 'event' | 'waypoint' };
// Includes roof, platform, sign, entrance ring, and a margin for passing riders.
const STATION_MIN = new THREE.Vector3(-5.6, -1.3, -7.8);
const STATION_MAX = new THREE.Vector3(5.6, 5.6, 7.2);
export const DEFAULT_STOP_FRACTIONS = [.138, .472, .806] as const;
export const WAYPOINT_MIN = new THREE.Vector3(-3.6, -1, -2.5);
export const WAYPOINT_MAX = new THREE.Vector3(3.6, 3.6, 2.5);

export function candidatesFor(track: CoasterTrack, { kind = 'event' }: { kind?: 'event' | 'waypoint' } = {}) {
  const scenic = kind === 'waypoint';
  const length = track.getLength();
  const divisions = Math.ceil(length / 1.5);
  const samples = Array.from({ length: divisions + 1 }, (_, i) => track.getPointAt(i / divisions));
  const candidates: StationPlacement[] = [];
  for (let distance = scenic ? 3 : 35; distance < length - (scenic ? 3 : 35); distance += 4) {
    const f = sampleTrack(track, distance, length);
    if (Math.abs(f.tangent.y) > (scenic ? .6 : .22) || Math.abs(f.curvature) > (scenic ? .08 : .026)) continue;
    const matrix = new THREE.Matrix4().makeBasis(f.side, f.up, f.tangent.clone().negate()).setPosition(f.point);
    const bounds = new THREE.Box3((scenic ? WAYPOINT_MIN : STATION_MIN).clone(), (scenic ? WAYPOINT_MAX : STATION_MAX).clone()).applyMatrix4(matrix);
    // A conservative slab test keeps the entire platform out of the sculpture.
    if (bounds.min.z < LOGO_DEPTH / 2 + 2 && bounds.max.z > -LOGO_DEPTH / 2 - 2) continue;
    if (BUILDING_BOUNDS.some(building => building.intersectsBox(bounds))) continue;
    const inverse = matrix.clone().invert(), local = new THREE.Vector3();
    let valid = true;
    for (let i = 0; i < samples.length; i++) {
      const along = i / (samples.length - 1) * length;
      if (trackSeparation(along, distance, length) < 16) {
        // The local rail must stay inside the open aisle, below the roof.
        local.copy(samples[i]).applyMatrix4(inverse);
        if (Math.abs(local.z) < (scenic ? 2.5 : 6.5) && (Math.abs(local.x) > .55 || Math.abs(local.y) > .6)) { valid = false; break; }
      } else if (bounds.distanceToPoint(samples[i]) < 2.2) { valid = false; break; }
    }
    if (valid) candidates.push({ distance, radius: scenic ? 12 : 22, name: 'Trackside terrace', point: f.point.clone(), bounds, kind });
  }
  return candidates;
}

export function maxStopGap(stops: CoasterStop[], length: number) {
  const distances = stops.map(stop => stop.distance).sort((a, b) => a - b);
  return distances.length ? Math.max(...distances.map((distance, i) => (distances[i + 1] ?? distances[0] + length) - distance)) : length;
}

/** Search complete circular layouts. A shortest-path lower bound prunes the
 * search; backtracking checks spatial conflicts even between non-neighbours. */
export function fillWaypoints(anchors: StationPlacement[], candidates: StationPlacement[], length: number, { reserve = 150, minSeparation = 40, maxStops = Math.max(12, anchors.length) } = {}) {
  if (!anchors.length || anchors.length >= maxStops || maxStopGap(anchors, length) <= reserve) return [...anchors];
  const origin = anchors[0].distance;
  const valid = candidates.filter(c => anchors.every(a => trackSeparation(c.distance, a.distance, length) > minSeparation && !c.bounds.intersectsBox(a.bounds)));
  const nodes = [...anchors, ...valid].map(stop => ({ stop, at: wrapDistance(stop.distance - origin, length), anchor: anchors.includes(stop) })).sort((a, b) => a.at - b.at);
  nodes.push({ ...nodes[0], at: length });
  const end = nodes.length - 1;
  const edges = nodes.map((node, i) => {
    const result: number[] = [];
    for (let j = i + 1; j <= end; j++) {
      if (nodes[j].at - node.at > minSeparation && (j === end || !node.stop.bounds.intersectsBox(nodes[j].stop.bounds))) result.push(j);
      if (nodes[j].anchor) break;
    }
    return result;
  });
  function solve(gap: number, limit: number): StationPlacement[] | null {
    const remaining = Array<number>(nodes.length).fill(Infinity); remaining[end] = 0;
    for (let i = end - 1; i >= 0; i--) for (const j of edges[i]) if (nodes[j].at - nodes[i].at <= gap) remaining[i] = Math.min(remaining[i], 1 + remaining[j]);
    if (remaining[0] > limit) return null;
    const path = [0];
    function visit(i: number): boolean {
      if (i === end) return true;
      const choices = edges[i].filter(j => nodes[j].at - nodes[i].at <= gap && path.length + remaining[j] <= limit);
      choices.sort((a, b) => remaining[a] - remaining[b] || a - b);
      for (const j of choices) {
        if (j !== end && path.some(p => nodes[p].stop.bounds.intersectsBox(nodes[j].stop.bounds))) continue;
        path.push(j); if (visit(j)) return true; path.pop();
      }
      return false;
    }
    return visit(0) ? path.slice(1, -1).filter(i => !nodes[i].anchor).map(i => nodes[i].stop) : null;
  }
  let additions = solve(reserve, maxStops);
  let target = reserve;
  if (!additions) {
    const gaps = [...new Set(edges.flatMap((targets, i) => targets.map(j => nodes[j].at - nodes[i].at)))].sort((a, b) => a - b);
    let low = 0, high = gaps.length - 1;
    while (low < high) { const mid = (low + high) >>> 1; if (solve(gaps[mid], maxStops)) high = mid; else low = mid + 1; }
    target = gaps[low]; additions = solve(target, maxStops);
  }
  // Prefer the fewest stops that satisfy the requested gap, keeping the map calm.
  for (let count = Math.max(anchors.length, Math.ceil(length / target)); count < maxStops; count++) {
    const fewer = solve(target, count); if (fewer) { additions = fewer; break; }
  }
  const names = ['Crown viewpoint', 'Mint portal', 'Garden junction', 'Skyline viewpoint', 'Connection portal', 'Canopy junction'];
  return [...anchors, ...(additions ?? []).map((stop, i) => ({ ...stop, kind: 'waypoint' as const, name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : '') }))];
}

export function createStationPlanner(track: CoasterTrack, { minSeparation = 48 } = {}) {
  const length = track.getLength(), candidates = candidatesFor(track);
  let scenicCandidates: StationPlacement[] | undefined;
  function next(existing: StationPlacement[], preferred?: number) {
    const valid = candidates.filter(candidate => existing.every(stop =>
      trackSeparation(candidate.distance, stop.distance, length) > minSeparation && !candidate.bounds.intersectsBox(stop.bounds)));
    valid.sort((a, b) => preferred !== undefined
      ? Math.abs(a.distance / length - preferred) - Math.abs(b.distance / length - preferred)
      : Math.min(...existing.map(s => trackSeparation(b.distance, s.distance, length)))
        - Math.min(...existing.map(s => trackSeparation(a.distance, s.distance, length))));
    return valid[0] ?? null;
  }
  function defaults(reserved: StationPlacement[] = []) {
    const result: StationPlacement[] = [];
    const names = ['West lookout', 'East observatory', 'Arrival gardens'];
    DEFAULT_STOP_FRACTIONS.forEach((fraction, i) => {
      const placement = next([...reserved, ...result], fraction);
      if (!placement) throw new Error('No clear default platform position.');
      result.push({ ...placement, name: names[i] });
    });
    return result;
  }
  function forEvents(events: (ClubEvent | null)[]) {
    // Reserve persisted platforms before retuning the three default anchors.
    // A new scenic layout must never displace an already published station.
    const reserved: StationPlacement[] = [];
    const saved = events.map((event, index) => {
      const placement = index >= 3 && event?.trackPosition !== undefined ? candidates.find(candidate => Math.abs(candidate.distance / length - event.trackPosition!) < 1e-9) : undefined;
      if (!placement || reserved.some(other => trackSeparation(other.distance, placement.distance, length) <= minSeparation || other.bounds.intersectsBox(placement.bounds))) return null;
      reserved.push(placement); return placement;
    });
    const anchors = defaults(reserved), occupied = [...anchors, ...reserved];
    return events.map((event, index) => {
      if (index < 3) return anchors[index];
      if (saved[index]) return saved[index];
      const placement = next(occupied, event?.trackPosition);
      if (placement) occupied.push(placement);
      return placement;
    });
  }
  return { next, defaults, candidates, forEvents, fillWaypoints: (anchors: StationPlacement[], options?: Parameters<typeof fillWaypoints>[3]) => fillWaypoints(anchors, scenicCandidates ??= candidatesFor(track, { kind: 'waypoint' }), length, options) };
}
