import layout from './event-logo.json' with { type: 'json' };
import type { ClubEvent } from '../types';

export type Point = { x: number; z: number };
export type MoveInput = { x: number; y: number };
export type WorldMode = 'overview' | 'explore';
export type WorldSnapshot = Point & { yaw: number; nearest: number | null; distance: number; moving: boolean };
export const WORLD = layout;
export type Station = { id: string; index: number; number: string; name: string; position: Point; radius: number; event: ClubEvent | null; kind?: 'event' | 'waypoint' };
export const SPAWN: Point = { x: layout.spawn[0], z: layout.spawn[1] };
export const START_YAW = Math.atan2(SPAWN.x - layout.route[1][0], SPAWN.z - layout.route[1][1]);
export const STATION_RADIUS = 1.5;
export const WALK_SPEED = 3.4;

// The navigation mask is the same traced floor minus the same doorway-cut walls
// used by the renderer, eroded by the player's radius (0.39 world units).
export function isWalkable(x: number, z: number): boolean {
  const col = Math.round(x / layout.unit + layout.width / 2);
  const row = Math.round(z / layout.unit + layout.height / 2);
  if (col < 0 || col >= layout.width || row < 0 || row >= layout.height) return false;
  const spans = layout.walkableRows[row];
  for (let i = 0; i < spans.length; i += 2) {
    if (col >= spans[i] && col < spans[i + 1]) return true;
  }
  return false;
}

export function movePlayer(position: Point, input: MoveInput, yaw: number, seconds: number): Point {
  const magnitude = Math.max(1, Math.hypot(input.x, input.y));
  const distance = WALK_SPEED * Math.max(0, Math.min(seconds, 0.1));
  const dx = (Math.cos(yaw) * input.x - Math.sin(yaw) * input.y) / magnitude * distance;
  const dz = (-Math.sin(yaw) * input.x - Math.cos(yaw) * input.y) / magnitude * distance;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (layout.unit * 0.45)));
  let { x, z } = position;
  for (let i = 0; i < steps; i++) {
    // Separate axes allow natural sliding along walls without crossing corners.
    if (isWalkable(x + dx / steps, z)) x += dx / steps;
    if (isWalkable(x, z + dz / steps)) z += dz / steps;
  }
  return { x, z };
}

export function createStations(events: ClubEvent[]): Station[] {
  const published = events.filter(event => event.published);
  const count = published.length || layout.stations.length;
  const points: Point[] = [];
  if (count <= layout.stations.length) {
    for (let i = 0; i < count; i++) {
      const [x, z] = layout.stations[Math.floor(i * layout.stations.length / count)];
      points.push({ x, z });
    }
  } else {
    // Sample the actual connected corridor, rejecting walls and the entrance.
    // Sampling scales with event count, so six, twenty, or more events all get
    // their own station without editing geometry or hard-coding new stops.
    const candidates: Point[] = [];
    const routeLength = layout.route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - layout.route[i][0], p[1] - layout.route[i][1]), 0);
    const step = Math.min(0.15, routeLength / (count * 12));
    let traveled = 0;
    for (let i = 1; i < layout.route.length; i++) {
      const [ax, az] = layout.route[i - 1], [bx, bz] = layout.route[i];
      const length = Math.hypot(bx - ax, bz - az);
      for (let along = 0; along < length; along += step) {
        const x = ax + (bx - ax) * along / length, z = az + (bz - az) * along / length;
        if (traveled + along > 7 && isWalkable(x, z)) candidates.push({ x, z });
      }
      traveled += length;
    }
    for (let i = 0; i < count; i++) points.push(candidates[Math.floor((i + 0.5) / count * candidates.length)]);
  }
  return points.map((position, index) => {
    const event = published[index] || null;
    const spacing = Math.min(...points.filter((_, i) => i !== index).map(other => Math.hypot(position.x - other.x, position.z - other.z)));
    return { id: event?.id || `placeholder-${index}`, index, number: String(index + 1).padStart(2, '0'),
      name: event?.title || ['The threshold', 'The idea lab', 'The workshop', 'The build room', 'The connection hub'][index],
      position, radius: Math.min(STATION_RADIUS, spacing * 0.43), event };
  });
}

export function nearestStation(position: Point, stations: Station[]): { index: number; distance: number } {
  let index = 0, distance = Infinity;
  stations.forEach((station, i) => {
    const d = Math.hypot(position.x - station.position.x, position.z - station.position.z);
    if (d < distance) { index = i; distance = d; }
  });
  return { index, distance };
}

export type ArrivalState = { candidate: number | null; stillFor: number; dismissed: number | null };
export function updateArrival(state: ArrivalState, position: Point, moving: boolean, seconds: number, stations: Station[]) {
  const near = nearestStation(position, stations);
  const candidate = near.distance <= stations[near.index].radius ? near.index : null;
  const dismissed = state.dismissed !== null && Math.hypot(
    position.x - stations[state.dismissed].position.x,
    position.z - stations[state.dismissed].position.z,
  ) < stations[state.dismissed].radius + 0.3 ? state.dismissed : null;
  const stillFor = !moving && candidate !== null && candidate !== dismissed
    ? (state.candidate === candidate ? state.stillFor : 0) + seconds : 0;
  return { candidate, dismissed, stillFor, arrived: stillFor >= 0.6 ? candidate : null };
}
