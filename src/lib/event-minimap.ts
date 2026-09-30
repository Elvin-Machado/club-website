import { WORLD } from './event-navigation.ts';
import { LOGO_CENTER_Y, LOGO_SCALE, type CoasterTrack } from './event-coaster.ts';

type Point3 = { x: number; y: number; z: number };
export type MapPoint = { x: number; y: number };
export type RideMapLayout = { route: string; logo: string[]; stations: (MapPoint | null)[]; start: MapPoint };

/** Fixed front elevation with a little depth, shared by logo, track, stops and cart. */
export function createRideMap(track: CoasterTrack) {
  const project = (point: Point3) => ({ x: point.x + point.z * .14, y: -point.y + point.z * .32 });
  const route = track.getPoints(500).map(project);
  const contours = WORLD.walls.map(wall => [wall.outline, ...wall.holes].map(outline => outline.map(([x, z]) => project({ x: x * LOGO_SCALE, y: LOGO_CENTER_Y - z * LOGO_SCALE, z: 0 }))));
  const points = [...route, ...contours.flat(2)];
  const minX = Math.min(...points.map(p => p.x)), minY = Math.min(...points.map(p => p.y));
  const spanX = Math.max(...points.map(p => p.x)) - minX, spanY = Math.max(...points.map(p => p.y)) - minY;
  const scale = Math.min(192 / spanX, 142 / spanY);
  const normalize = (p: MapPoint) => ({ x: (p.x - minX - spanX / 2) * scale + 120, y: (p.y - minY - spanY / 2) * scale + 95 });
  const path = (line: MapPoint[]) => line.map((p, i) => { const n = normalize(p); return `${i ? 'L' : 'M'}${n.x.toFixed(2)},${n.y.toFixed(2)}`; }).join(' ') + ' Z';
  return {
    project: (point: Point3) => normalize(project(point)),
    layout: (stations: (Point3 | null)[]): RideMapLayout => ({ route: path(route), logo: contours.map(wall => wall.map(path).join(' ')), stations: stations.map(p => p ? normalize(project(p)) : null), start: normalize(route[0]) }),
  };
}
