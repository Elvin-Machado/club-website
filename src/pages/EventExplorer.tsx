import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, CalendarDays, Layers3, MapPin, RotateCcw, Route, X } from 'lucide-react';
import { createStations, type MoveInput, type WorldMode } from '../lib/event-navigation';
import type { ClubEvent } from '../types';
import './event-explorer.css';

const LogoWorld = lazy(() => import('../components/shared/LogoWorld'));

class WorldBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function EventDialog({ children, label, onClose }: { children: ReactNode; label: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="nx-dialog" aria-label={label} onCancel={event => { event.preventDefault(); onClose(); }}>
    <button className="nx-close" onClick={onClose} aria-label="Close event"><X size={18} /></button>
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

export default function EventExplorer({ events }: { events: ClubEvent[] }) {
  const stations = useMemo(() => createStations(events), [events]);
  const wrapper = useRef<HTMLElement>(null);
  const input = useRef<MoveInput>({ x: 0, y: 0 });
  const [mode, setMode] = useState<WorldMode>('explore');
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [reduced, setReduced] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [command, setCommand] = useState<{ serial: number; station: number | null; resume?: boolean }>({ serial: 0, station: null });
  const station = selected === null ? null : stations[selected];
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const focusWorld = () => wrapper.current?.querySelector<HTMLElement>('.nx-world')?.focus({ preventScroll: true });
  const selectStation = (index: number) => { input.current = { x: 0, y: 0 }; setSelected(index); };
  const toggleMap = () => { input.current = { x: 0, y: 0 }; setMode(value => value === 'explore' ? 'overview' : 'explore'); };
  const continueRide = useCallback(() => {
    if (!failed) {
      if (mode === 'overview') { setCommand(value => ({ serial: value.serial + 1, station: selected })); setMode('explore'); }
      else setCommand(value => ({ serial: value.serial + 1, station: null, resume: true }));
    }
    setSelected(null);
  }, [failed, mode, selected]);
  useEffect(() => {
    if (selected === null) return;
    const resume = (event: KeyboardEvent) => {
      if (event.code === 'KeyW' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); continueRide(); }
    };
    window.addEventListener('keydown', resume);
    return () => window.removeEventListener('keydown', resume);
  }, [selected, continueRide]);
  return <section className={`nx-experience nx-${mode}`} ref={wrapper} aria-label="Nucleus roller coaster" data-reduced-motion={reduced}>
    <h1 className="nx-sr-only">Inside Nucleus</h1>
    <p id="nx-control-summary" className="nx-sr-only">Hold W or D to accelerate. S or A brakes and reverses. Release to coast. Drag the scene to look around. Use the joystick on touchscreens. The cart automatically stops at event platforms. Continue or press W to resume. Open Map to rotate the upright logo and select an event station.</p>
    {!failed && <WorldBoundary onError={() => setFailed(true)}><Suspense fallback={null}>
      <LogoWorld stations={stations} mode={mode} paused={selected !== null} reduced={reduced} input={input} command={command}
        onReady={() => setReady(true)} onError={() => setFailed(true)} onArrive={selectStation} onSelect={selectStation} />
    </Suspense></WorldBoundary>}
    <div className="nx-vignette" aria-hidden="true" />
    <div className="nx-ride-caption"><span>THE LOGO LOOP</span><small>Six passages. A whole new perspective.</small></div>
    {!ready && !failed && <div className="nx-loading" role="status"><span /><span className="nx-sr-only">Loading the ride</span></div>}
    {!failed && <>
      <Joystick input={input} disabled={!ready || mode === 'overview' || selected !== null} onFocus={focusWorld} />
      <button className="nx-restart-button" disabled={!ready} aria-label="Restart the roller coaster" title="Restart ride" onClick={() => { setSelected(null); setCommand(value => ({ serial: value.serial + 1, station: null })); setMode('explore'); }}><RotateCcw size={18} /></button>
      <button className="nx-map-button" onClick={toggleMap} disabled={!ready} aria-pressed={mode === 'overview'} aria-label={mode === 'overview' ? 'Return to ride' : 'Open holographic map'}>
        {mode === 'overview' ? <Route size={17} /> : <Layers3 size={17} />}<span>{mode === 'overview' ? 'Ride' : 'Map'}</span>
      </button>
    </>}
    {failed && <div className="nx-fallback" role="status"><Layers3 size={32} /><h2>The ride is unavailable.</h2><p>You can still explore the events.</p>
      <div>{stations.map(item => <button key={item.id} onClick={() => selectStation(item.index)}><span>{item.number}</span>{item.name}<ArrowRight size={16} /></button>)}</div>
      <a href="/">Back to Nucleus</a>
    </div>}
    {station && <EventDialog label={station.event?.title || station.name} onClose={() => setSelected(null)}>
      <div className="nx-event-orbit" aria-hidden="true"><i /><i /><i /><span>{station.number}</span></div>
      {station.event?.category && <span className="nx-event-category">{station.event.category}</span>}
      <h2>{station.event?.title || station.name}</h2>
      <p>{station.event?.description || 'A new experience is on its way. Keep exploring Nucleus.'}</p>
      {station.event && <div className="nx-event-details">
        {station.event.startsAt && <span><CalendarDays size={16} />{new Date(station.event.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST</span>}
        {station.event.location && <span><MapPin size={16} />{station.event.location}</span>}
      </div>}
      {station.event?.registrationUrl && /^https?:\/\//i.test(station.event.registrationUrl) && <a className="nx-register" href={station.event.registrationUrl} target="_blank" rel="noreferrer">Register for event<ArrowRight size={16} /></a>}
      <button className="nx-continue" onClick={continueRide}>{failed ? 'Back to events' : mode === 'overview' ? 'Ride from here' : 'Continue ride'}<ArrowRight size={17} /></button>
      {!failed && <p className="nx-continue-hint">or release and press W to continue</p>}
    </EventDialog>}
  </section>;
}
