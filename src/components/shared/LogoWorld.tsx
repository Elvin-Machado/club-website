import { useEffect, useRef, type RefObject } from 'react';
import { type Station, type MoveInput, type WorldMode, type WorldSnapshot } from '../../lib/event-navigation';
import { createEventWorld } from '../../lib/event-world';
import type { RideGlimpsesHandle } from './RideGlimpses';
import type { RideMapHandle } from './RideMap';
import type { RideMapLayout } from '../../lib/event-minimap';

export interface LogoWorldProps {
  stations: Station[];
  mode: WorldMode;
  paused: boolean;
  reduced: boolean;
  input: RefObject<MoveInput>;
  boostInput: RefObject<boolean>;
  glimpses: RefObject<RideGlimpsesHandle | null>;
  minimap: RefObject<RideMapHandle | null>;
  onTravelChange: (station: number | null) => void;
  onBoostChange: (active: boolean) => void;
  command: { serial: number; station: number | null; resume?: boolean; driveKey?: string; travel?: boolean };
  onReady: () => void;
  onError: () => void;
  onSnapshot?: (snapshot: WorldSnapshot) => void;
  onArrive: (index: number) => void;
  onBoard: (index: number) => void;
  onAnticipate: (station: number | null, secondsToArrival: number, distance: number) => void;
  onLayout?: (available: boolean[], map: RideMapLayout) => void;
}

export default function LogoWorld(props: LogoWorldProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;
  useEffect(() => {
    if (!host.current) return;
    try { return createEventWorld(host.current, () => live.current); }
    catch (error) { console.error('Unable to create the Nucleus world:', error); live.current.onError(); }
  }, []);
  return <div ref={host} className="nx-world" tabIndex={0} role="group"
    aria-label="Nucleus roller coaster. W or D to accelerate, S or A to brake and reverse. Hold Shift to boost. Drag to look. E opens a nearby station."
    aria-describedby="nx-control-summary">
    <div className="nx-world-markers" aria-label="Stations on the map" hidden={props.mode !== 'overview' || props.paused}>
      {props.stations.map(station => <button key={station.id} data-world-station={station.id} data-stop-kind="event"
        onClick={() => props.onBoard(station.index)} aria-label={`Ride from station ${station.number}: ${station.name}`}>
        <span>{station.number}</span><small>{station.name}</small>
      </button>)}
    </div>
  </div>;
}
