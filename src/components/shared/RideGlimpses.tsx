import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { Station } from '../../lib/event-navigation';
import { glimpseFrame, GLIMPSE_SLOTS, GLIMPSE_FADE } from '../../lib/event-cinematics';

export interface RideGlimpsesHandle { update: (station: Station | null, remaining: number, seconds: number) => void }

function GlimpsePhoto({ url, name }: { url?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return url && !failed
    ? <img src={url} alt={name} decoding="async" onError={() => setFailed(true)} />
    : <div className="nx-glimpse-placeholder"><ImageIcon size={27} strokeWidth={1} /><span>Photo coming soon</span><i aria-hidden="true" /></div>;
}

export default function RideGlimpses({ ref }: { ref: Ref<RideGlimpsesHandle> }) {
  const [station, setStation] = useState<Station | null>(null);
  const current = useRef<Station | null>(null);
  const container = useRef<HTMLElement>(null);
  const visibility = useRef(0);
  const elapsed = useRef(0);
  const [photos, setPhotos] = useState(() => Array.from({ length: GLIMPSE_SLOTS }, (_, i) => i));
  const photoIndices = useRef(photos);
  const frames = useRef<(HTMLElement | null)[]>([]);
  // Recycle hidden layers so upcoming photos load before their turn.
  useImperativeHandle(ref, () => ({ update(next, remaining, seconds) {
    const step = Math.max(0, seconds) / GLIMPSE_FADE;
    visibility.current = next ? Math.min(1, visibility.current + step) : Math.max(0, visibility.current - step);
    if (container.current) {
      container.current.style.opacity = String(visibility.current);
      container.current.dataset.fading = String(!next && current.current !== null);
    }
    // Retain the last rendered photos and poses while fading after a sudden stop.
    if (!next) {
      if (visibility.current === 0 && current.current) { current.current = null; setStation(null); }
      return;
    }
    if (current.current !== next) { current.current = next; elapsed.current = 0; setStation(next); }
    elapsed.current += Math.max(0, seconds);
    const poses = Array.from({ length: GLIMPSE_SLOTS }, (_, slot) => glimpseFrame(elapsed.current, slot, remaining));
    const indices = poses.map(pose => pose.photoIndex);
    if (indices.some((index, slot) => index !== photoIndices.current[slot])) { photoIndices.current = indices; setPhotos(indices); }
    frames.current.forEach((element, slot) => {
      if (!element) return;
      const pose = poses[slot];
      element.style.opacity = String(pose.opacity);
      element.style.transform = `translate3d(0, -50%, 0) scale(${pose.scale})`;
      element.setAttribute('aria-hidden', String(pose.opacity === 0));
    });
  } }), []);

  return <aside ref={container} className="nx-glimpses" hidden={!station} aria-label={station ? `A glimpse of the next event: ${station.name}` : undefined}>
    {station && photos.map((photoIndex, slot) => {
      const album = station.event?.photos ?? [];
      const photo = album[photoIndex % album.length];
      return <figure className={`nx-glimpse nx-glimpse-${photoIndex % 2 ? 'right' : 'left'}`} key={slot} data-frame={photoIndex} aria-hidden="true" ref={element => { frames.current[slot] = element; }}>
        <div className="nx-glimpse-photo">
          <GlimpsePhoto key={`${station.id}-${photo?.url ?? slot}`} url={photo?.url} name={photo?.name || station.name} />
          <span className="nx-glimpse-index" aria-hidden="true">{photo ? `PHOTO ${String(photoIndex % album.length + 1).padStart(2, '0')}` : 'NUCLEUS'}<i /></span>
        </div>
        <figcaption><span>UP AHEAD <i /> {station.number}</span><strong>{station.name}</strong><small>{station.event?.category || 'The Nucleus collection'}</small></figcaption>
      </figure>;
    })}
  </aside>;
}
