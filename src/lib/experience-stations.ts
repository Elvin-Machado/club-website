import type { ClubEvent } from '../types';
import type { Station } from './event-navigation';

export function createExperienceStations(events: ClubEvent[]): Station[] {
  const published: (ClubEvent | null)[] = events.filter(event => event.published && event.trackPosition === undefined);
  while (published.length < 3) published.push(null);
  return [...published, ...events.filter(event => event.published && event.trackPosition !== undefined)].map((event, index) => ({
    id: event?.id ?? `preview-station-${index}`, index, number: String(index + 1).padStart(2, '0'),
    name: event?.title ?? ['The first connection', 'The idea lab', 'The build room'][index],
    position: { x: 0, z: 0 }, radius: 22, event,
  }));
}
