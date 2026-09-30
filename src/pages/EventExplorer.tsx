import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, CalendarDays, Layers3, MapPin, Plus, RotateCcw, Route, X, Zap } from 'lucide-react';
import { type MoveInput, type WorldMode } from '../lib/event-navigation';
import type { LogoWorldProps } from '../components/shared/LogoWorld';
import type { RideMapLayout } from '../lib/event-minimap';
import { createExperienceStations } from '../lib/experience-stations';
import { shouldShowJoystick } from '../lib/event-quality';
import type { ClubEvent } from '../types';
import RideGlimpses, { type RideGlimpsesHandle } from '../components/shared/RideGlimpses';
import RideMap, { type RideMapHandle } from '../components/shared/RideMap';
import './event-explorer.css';

const LogoWorld = lazy(() => import('../components/shared/LogoWorld'));
const AddEventForm = lazy(() => import('./AddEventForm'));

function eventArtwork(category: string): CSSProperties {
  let hash = 2166136261;
  for (const char of category.toLowerCase()) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return { '--event-hue': hash % 360, '--event-angle': `${25 + hash % 130}deg` } as CSSProperties;
}

function eventDate(value?: string) {
  return value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
}

class WorldBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function EventDialog({ children, label, onClose, busy = false }: { children: ReactNode; label: string; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="nx-dialog" aria-label={label} aria-busy={busy} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <button className="nx-close" disabled={busy} onClick={onClose} aria-label="Close event"><X size={18} /></button>
    {children}
  </dialog>;
}

function Joystick({ input, disabled, onFocus }: { input: RefObject<MoveInput>; disabled: boolean; onFocus: () => void }) {
  const active = useRef<number | null>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const reset = useCallback(() => {
    active.current = null; input.current = { x: 0, y: 0 };
    if (knob.current) knob.current.style.transform = 'translate(0, 0)';
  }, [input]);
  useEffect(() => {
    window.addEventListener('blur', reset); document.addEventListener('visibilitychange', reset);
    return () => { reset(); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', reset); };
  }, [reset]);
  useEffect(() => { if (disabled) reset(); }, [disabled, reset]);
  function update(event: PointerEvent<HTMLButtonElement>) {
    if (active.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect(), radius = rect.width * 0.29;
    let x = event.clientX - rect.left - rect.width / 2, y = event.clientY - rect.top - rect.height / 2;
    const distance = Math.hypot(x, y);
    if (distance > radius) { x *= radius / distance; y *= radius / distance; }
    input.current = { x: distance < 5 ? 0 : x / radius, y: distance < 5 ? 0 : -y / radius };
    if (knob.current) knob.current.style.transform = `translate(${x}px, ${y}px)`;
  }
  return <button className="nx-joystick" disabled={disabled} aria-label="Ride joystick. Drag up or right to accelerate; down or left to brake and reverse. You can also use W D and S A."
    aria-describedby="nx-control-summary" title="W / D to accelerate · S / A to brake and reverse"
    onPointerDown={event => { if (active.current !== null) return; event.preventDefault(); onFocus(); active.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); update(event); }}
    onPointerMove={update} onPointerUp={reset} onPointerCancel={reset} onLostPointerCapture={reset}>
    <span className="nx-joystick-track" /><ArrowUp className="nx-joystick-up" size={13} /><ArrowDown className="nx-joystick-down" size={13} />
    <span ref={knob} className="nx-joystick-knob"><span /><span /><span /></span>
  </button>;
}

function BoostControl({ input, active, disabled, touch, onFocus }: { input: RefObject<boolean>; active: boolean; disabled: boolean; touch: boolean; onFocus: () => void }) {
  const pointer = useRef<number | null>(null);
  const reset = useCallback(() => { input.current = false; pointer.current = null; }, [input]);
  useEffect(() => {
    window.addEventListener('blur', reset); document.addEventListener('visibilitychange', reset);
    return () => { reset(); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', reset); };
  }, [reset]);
  useEffect(() => { if (disabled) reset(); }, [disabled, reset]);
  return <button className="nx-boost-button" type="button" disabled={disabled} aria-pressed={active} aria-label="Hold to boost. Keyboard shortcut: Shift."
    onPointerDown={event => { if (event.button !== 0 || pointer.current !== null) return; event.preventDefault(); onFocus(); pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); input.current = true; }}
    onPointerUp={event => { if (event.pointerId === pointer.current) reset(); }} onPointerCancel={reset} onLostPointerCapture={reset} onBlur={reset}
    onKeyDown={event => { if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); input.current = true; } }}
    onKeyUp={event => { if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); reset(); } }}>
    <Zap size={16} /><span>Boost</span><small>{touch ? 'HOLD' : 'SHIFT'}</small>
  </button>;
}

export default function EventExplorer({ events, onPublished }: { events: ClubEvent[]; onPublished: (event: ClubEvent) => void }) {
  const stations = useMemo(() => createExperienceStations(events), [events]);
  const [mapLayout, setMapLayout] = useState<RideMapLayout | null>(null);
  const [traveling, setTraveling] = useState<number | null>(null);
  const wrapper = useRef<HTMLElement>(null);
  const input = useRef<MoveInput>({ x: 0, y: 0 });
  const boostInput = useRef(false);
  const glimpses = useRef<RideGlimpsesHandle>(null);
  const minimap = useRef<RideMapHandle>(null);
  const [boosting, setBoosting] = useState(false);
  const [mode, setMode] = useState<WorldMode>('overview');
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [reduced, setReduced] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false), [publishing, setPublishing] = useState(false), [listing, setListing] = useState(false);
  const [touchControls, setTouchControls] = useState(false), [notice, setNotice] = useState('');
  const [available, setAvailable] = useState<boolean[]>([]);
  const [anticipation, setAnticipation] = useState<{ index: number; seconds: number; distance: number } | null>(null);
  const onAnticipate = useCallback((index: number | null, seconds: number, distance: number) => setAnticipation(value => index === null ? value === null ? value : null : { index, seconds, distance }), []);
  const onLayout = useCallback((layout: boolean[], map: RideMapLayout) => { setAvailable(layout); setMapLayout(map); }, []);
  const paused = selected !== null || adding || listing;
  const [command, setCommand] = useState<LogoWorldProps['command']>({ serial: 0, station: null });
  const station = selected === null ? null : stations[selected];
  const upcoming = anticipation === null ? null : stations[anticipation.index];
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const pointer = window.matchMedia('(pointer: coarse)');
    const update = () => setTouchControls(shouldShowJoystick('ontouchstart' in window || navigator.maxTouchPoints > 0, pointer.matches, window.innerWidth));
    update(); pointer.addEventListener('change', update); window.addEventListener('resize', update, { passive: true });
    return () => { pointer.removeEventListener('change', update); window.removeEventListener('resize', update); };
  }, []);
  const focusWorld = () => wrapper.current?.querySelector<HTMLElement>('.nx-world')?.focus({ preventScroll: true });
  const selectStation = (index: number) => { input.current = { x: 0, y: 0 }; setSelected(index); };
  const toggleMap = () => { input.current = { x: 0, y: 0 }; setSelected(null); setAnticipation(null); setMode(value => value === 'explore' ? 'overview' : 'explore'); };
  const boardStation = (index: number) => {
    if (available[index] === false) { selectStation(index); return; }
    setCommand(value => ({ serial: value.serial + 1, station: index })); setMode('explore'); setAnticipation(null); selectStation(index);
  };
  const travelToStation = (index: number) => {
    if (available[index] === false) { selectStation(index); return; }
    input.current = { x: 0, y: 0 }; setSelected(null); setAnticipation(null); setMode('explore');
    setCommand(value => ({ serial: value.serial + 1, station: index, travel: true }));
  };
  const continueRide = useCallback((driveKey?: string) => {
    if (!failed && (selected === null || available[selected] !== false)) {
      if (mode === 'overview') { setCommand(value => ({ serial: value.serial + 1, station: selected, driveKey })); setMode('explore'); }
      else setCommand(value => ({ serial: value.serial + 1, station: null, resume: true, driveKey }));
    }
    setSelected(null);
  }, [failed, mode, selected, available]);
  useEffect(() => {
    if (selected === null) return;
    const resume = (event: KeyboardEvent) => {
      if (['KeyW', 'KeyD', 'KeyS', 'KeyA', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.code) && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); continueRide(event.code); }
    };
    window.addEventListener('keydown', resume);
    return () => window.removeEventListener('keydown', resume);
  }, [selected, continueRide]);
  return <section className={`nx-experience nx-${mode}`} ref={wrapper} aria-label="Nucleus roller coaster" data-reduced-motion={reduced} data-touch-controls={touchControls}>
    <h1 className="nx-sr-only">Inside Nucleus</h1>
    <p id="nx-control-summary" className="nx-sr-only">Hold W or D to accelerate. S or A brakes and reverses. Hold Shift or the Boost button to speed up; release to return to cruising speed. Drag the scene to look around. Use the joystick on touchscreens. The track loops back to the start. The cart automatically stops at event stations, including while boosting. Close the event or press a drive key to continue. Click a checkpoint in the top-right route map to travel to that station automatically; a drive control takes over. On the full map, drag to orbit, right-drag or use two fingers to pan, and scroll or pinch to zoom.</p>
    {!failed && <WorldBoundary onError={() => setFailed(true)}><Suspense fallback={null}>
      <LogoWorld stations={stations} mode={mode} paused={paused} reduced={reduced} input={input} boostInput={boostInput} glimpses={glimpses} minimap={minimap} onTravelChange={setTraveling} onBoostChange={setBoosting} command={command} onLayout={onLayout} onAnticipate={onAnticipate}
        onReady={() => setReady(true)} onError={() => setFailed(true)} onArrive={selectStation} onBoard={boardStation} />
    </Suspense></WorldBoundary>}
    <div className="nx-vignette" aria-hidden="true" />
    <div className="nx-boost-focus" aria-hidden="true"><svg viewBox="0 0 1000 700" preserveAspectRatio="none"><path d="M-80 10 280 240 M60-40 330 220 M-70 220 250 290 M-60 540 280 420 M70 740 330 450 M250 760 400 480 M1080 10 720 240 M940-40 670 220 M1070 220 750 290 M1060 540 720 420 M930 740 670 450 M750 760 600 480" /></svg></div>
    <RideGlimpses ref={glimpses} />
    <div className="nx-topbar"><div className="nx-ride-caption"><span>THE LOGO LOOP</span><small>Six passages. One endless journey.</small></div>
    <div className="nx-event-actions"><button onClick={() => { input.current = { x: 0, y: 0 }; setListing(true); }}>Events <span>{stations.length}</span></button><button onClick={() => { input.current = { x: 0, y: 0 }; setAdding(true); }}><Plus size={15} />Add Event</button></div>
    </div>
    {!failed && <RideMap ref={minimap} layout={mapLayout} stations={stations} ready={ready} traveling={traveling} onTravel={travelToStation} />}

    {!reduced && !paused && mode === 'explore' && upcoming && anticipation && <aside className="nx-teaser" aria-live="polite" aria-atomic="true" style={{ opacity: Math.min(1, (90 - anticipation.distance) / 12, (anticipation.distance - 15) / 10) }}>
      <svg className="nx-approach-arc" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" /><circle cx="22" cy="22" r="19" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - (90 - anticipation.distance) / 75} /></svg>
      <div><span className="nx-event-category">{upcoming.event?.category || 'Preview station'} · {upcoming.number}</span>
        <h2>{upcoming.name}</h2>{upcoming.event?.startsAt && <p>{eventDate(upcoming.event.startsAt)}</p>}
        <small>{anticipation.distance <= 60 ? 'Viewing station' : 'Coming up'}</small>
      </div>
    </aside>}
    {notice && <p className="nx-publish-notice" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14} /></button></p>}
    {!ready && !failed && <div className="nx-loading" role="status"><span /><span className="nx-sr-only">Loading the ride</span></div>}
    {!failed && <div className="nx-controls" aria-label="Ride controls">
      {touchControls && <Joystick input={input} disabled={!ready || mode === 'overview' || paused} onFocus={focusWorld} />}
      {!touchControls && <p className="nx-keyboard-hint">{mode === 'overview' ? 'Your journey starts at any checkpoint' : 'W / D forward · S / A reverse'}<br /><span>{mode === 'overview' ? 'Select a station, then drive at your own pace' : 'Drag to look · Release to coast'}</span></p>}
      <div className="nx-ride-actions"><BoostControl input={boostInput} active={boosting} disabled={!ready || mode === 'overview' || paused} touch={touchControls} onFocus={focusWorld} />
      <button className="nx-restart-button" disabled={!ready} aria-label="Restart the roller coaster" title="Restart ride" onClick={() => { setSelected(null); setCommand(value => ({ serial: value.serial + 1, station: null })); setMode('explore'); }}><RotateCcw size={18} /></button>
      <button className="nx-map-button" onClick={toggleMap} disabled={!ready} aria-pressed={mode === 'overview'} aria-label={mode === 'overview' ? 'Return to ride' : 'Open holographic map'}>
        {mode === 'overview' ? <Route size={17} /> : <Layers3 size={17} />}<span>{mode === 'overview' ? 'Ride' : 'Map'}</span>
      </button>
      </div>
    </div>}
    {failed && <div className="nx-fallback" role="status"><Layers3 size={32} /><h2>The ride is unavailable.</h2><p>You can still explore the events.</p>
      <div>{stations.map(item => <button key={item.id} onClick={() => selectStation(item.index)}><span>{item.number}</span>{item.name}<ArrowRight size={16} /></button>)}</div>
      <a href="/">Back to Nucleus</a>
    </div>}
    {adding && <EventDialog label="Add Event" busy={publishing} onClose={() => setAdding(false)}><Suspense fallback={<p role="status">Opening event form…</p>}><AddEventForm onBusy={setPublishing} onPublished={event => { onPublished(event); setAdding(false); setNotice(`“${event.title}” is published. Find its new station on the map.`); }} /></Suspense></EventDialog>}
    {listing && <EventDialog label="Event stations" onClose={() => setListing(false)}><span className="nx-event-category">Explore every connection</span><h2>Event stations</h2><div className="nx-station-list">{stations.map(item => <button key={item.id} onClick={() => { setListing(false); selectStation(item.index); }}><span>{item.number}</span><span>{item.name}{!item.event && <small>Preview station</small>}{available[item.index] === false && <small>Gallery only · track at capacity</small>}</span><ArrowRight size={16} /></button>)}</div></EventDialog>}
    {station && <EventDialog label={station.event?.title || station.name} onClose={() => continueRide()}>
      <div className={`nx-event-orbit${!station.event?.photos?.length ? ' nx-event-artwork' : ''}`} style={eventArtwork(station.event?.category || station.name)} aria-hidden="true"><i /><i /><i /><span>{station.number}</span></div>
      {station.event?.category && <span className="nx-event-category">{station.event.category}</span>}
      <h2>{station.event?.title || station.name}</h2>
      {!station.event && <span className="nx-event-category">Preview station</span>}
      <p>{station.event?.description || 'A new experience is on its way. Keep exploring Nucleus.'}</p>
      {station.event && <div className="nx-event-details">
        {station.event.startsAt && <span><CalendarDays size={16} />{new Date(station.event.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST</span>}
        {station.event.location && <span><MapPin size={16} />{station.event.location}</span>}
      </div>}
      {!!station.event?.photos?.length && <div className="nx-event-gallery" aria-label="Event photos">{station.event.photos.map((photo, index) => <figure key={photo.id}><a href={photo.url} target="_blank" rel="noreferrer" aria-label={`Open photo ${index + 1}: ${photo.name}`}><img src={photo.url} alt={`${station.name} — ${photo.name}`} loading="lazy" decoding="async" /></a><figcaption>{photo.name}</figcaption></figure>)}</div>}
      {station.event?.albumUrl && /^https?:\/\//i.test(station.event.albumUrl) && <a className="nx-register" href={station.event.albumUrl} target="_blank" rel="noreferrer">View photo album<ArrowRight size={16} /></a>}
      {station.event?.registrationUrl && /^https?:\/\//i.test(station.event.registrationUrl) && <a className="nx-register" href={station.event.registrationUrl} target="_blank" rel="noreferrer">Register for event<ArrowRight size={16} /></a>}
      {selected !== null && available[selected] === false && <p className="nx-form-status">The track is at capacity. This event is available here in the gallery.</p>}
      <button className="nx-continue" onClick={() => continueRide()}>{failed ? 'Back to events' : mode === 'overview' && available[selected!] !== false ? 'Ride from here' : 'Continue ride'}<ArrowRight size={17} /></button>
      {!failed && <p className="nx-continue-hint">Then hold {touchControls ? 'the joystick' : 'W / D'} to depart.</p>}
    </EventDialog>}
  </section>;
}
