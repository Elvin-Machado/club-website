import { useImperativeHandle, useRef, type Ref } from 'react';
import type { Station } from '../../lib/event-navigation';
import type { MapPoint, RideMapLayout } from '../../lib/event-minimap';

export interface RideMapHandle { update: (point: MapPoint) => void }

export default function RideMap({ ref, layout, stations, ready, traveling, onTravel }: {
  ref: Ref<RideMapHandle>; layout: RideMapLayout | null; stations: Station[]; ready: boolean;
  traveling: number | null; onTravel: (index: number) => void;
}) {
  const cart = useRef<SVGGElement>(null);
  useImperativeHandle(ref, () => ({ update(point) { cart.current?.setAttribute('transform', `translate(${point.x} ${point.y})`); } }), []);
  return <nav className="nx-minimap" aria-label="Ride route map">
    <div className="nx-minimap-heading"><span>THE LOOP</span><i aria-hidden="true" />LIVE</div>
    <div className="nx-minimap-drawing">
      <svg viewBox="0 0 240 190" aria-hidden="true">
        {layout?.logo.map((path, i) => <path key={i} className="nx-minimap-logo" d={path} fillRule="evenodd" />)}
        {layout && <><path className="nx-minimap-track" d={layout.route} /><circle className="nx-minimap-start" cx={layout.start.x} cy={layout.start.y} r="3" /><text x={layout.start.x + 7} y={layout.start.y + 4}>START</text></>}
        <g ref={cart} className="nx-minimap-cart" transform={layout ? `translate(${layout.start.x} ${layout.start.y})` : undefined}><circle r="7" /><circle r="3" /></g>
      </svg>
      {stations.map((station, index) => {
        const point = layout?.stations[index];
        return point && <button key={station.id} type="button" disabled={!ready} aria-label={`Travel to station ${station.number}: ${station.name}`} aria-pressed={traveling === index}
          title={`Station ${station.number} · ${station.name}`} style={{ left: `${point.x / 2.4}%`, top: `${point.y / 1.9}%` }} onClick={() => onTravel(index)}>{station.number}</button>;
      })}
    </div>
    <p aria-live="polite">{traveling === null ? 'Click a station to travel' : `Traveling to station ${stations[traveling]?.number}`}</p>
  </nav>;
}
