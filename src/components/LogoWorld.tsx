import { useEffect, useRef, type RefObject } from 'react';
import { type Station, type MoveInput, type WorldMode, type WorldSnapshot } from '../lib/event-navigation';
import { createEventWorld } from '../lib/event-world';

export interface LogoWorldProps {
  stations: Station[];
  mode: WorldMode;
  paused: boolean;
  reduced: boolean;
  input: RefObject<MoveInput>;
  command: { serial: number; station: number | null };
  onReady: () => void;
  onError: () => void;
  onSnapshot: (snapshot: WorldSnapshot) => void;
  onArrive: (index: number) => void;
  onSelect: (index: number) => void;
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
    aria-label="Interactive Nucleus logo. W A S D to move, left and right arrows to turn, drag to look. E opens a nearby station."
    aria-describedby="nx-control-summary">
    <div className="nx-world-markers" aria-label="Stations on the map" hidden={props.mode !== 'overview' || props.paused}>
      {props.stations.map(station => <button key={station.id} data-world-station={station.id}
        onClick={() => props.onSelect(station.index)} aria-label={`Open station ${station.number}: ${station.name}`}>
        <span>{station.number}</span><small>{station.name}</small>
      </button>)}
    </div>
  </div>;
}
