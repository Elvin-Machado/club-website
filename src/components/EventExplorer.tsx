import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, Compass, Expand, ImageIcon, Layers3, List, LoaderCircle, MapPin, Maximize2, MousePointer2, Move, Plus, RotateCcw, ScanLine, X } from 'lucide-react';
const logoUrl = '/NucleusLogo_transparent.png';
import { SPAWN, START_YAW, createStations, WORLD, type Station, type MoveInput, type WorldMode, type WorldSnapshot } from '../lib/event-navigation';
import type { ClubEvent } from '../types';
import './event-explorer.css';

const LogoWorld = lazy(() => import('./LogoWorld'));
const mapPath = WORLD.floor.map(outline => `M${outline.map(p => p.join(',')).join('L')}Z`).join('');
const wallPath = WORLD.walls.map(wall => [wall.outline, ...wall.holes].map(outline => `M${outline.map(p => p.join(',')).join('L')}Z`).join('')).join('');

class WorldBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function ExplorerDialog({ children, label, className = '', onClose }: { children: ReactNode; label: string; className?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={`nx-dialog ${className}`} aria-label={label}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) {
      const r = event.currentTarget.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose();
    } }}>{children}</dialog>;
}

function Minimap({ snapshot, stations, visited, onOpen }: { snapshot: WorldSnapshot; stations: Station[]; visited: string[]; onOpen: () => void }) {
  return <button className="nx-minimap" onClick={onOpen} aria-label="Open the full logo map">
    <span className="nx-minimap-heading">YOU ARE HERE <Maximize2 size={12} /></span>
    <svg viewBox="-25 -23 50 47" aria-hidden="true">
      <path d={mapPath} fill="#14362b" stroke="#567f68" strokeWidth=".2" />
      <path d={wallPath} fill="#669e7e" fillRule="evenodd" />
      <polyline points={WORLD.route.map(p => p.join(',')).join(' ')} fill="none" stroke="#d8c28b" strokeWidth=".18" />
      {stations.map(station => <circle key={station.id} cx={station.position.x} cy={station.position.z} r=".65" fill={visited.includes(station.id) ? '#d8c28b' : '#173128'} stroke="#d8c28b" strokeWidth=".2" />)}
      <g transform={`translate(${snapshot.x} ${snapshot.z}) rotate(${-snapshot.yaw * 180 / Math.PI})`}>
        <circle r="1.4" fill="#ddffe0" opacity=".15" /><path d="M0 -1.2L.75 .8L0 .45L-.75 .8Z" fill="#f1fff3" />
      </g>
    </svg>
    <span className="nx-minimap-caption"><i /> Your position <span>MAP <ArrowUpRight size={10} /></span></span>
  </button>;
}

function Joystick({ input, onFocus }: { input: RefObject<MoveInput>; onFocus: () => void }) {
  const active = useRef<number | null>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const update = (event: PointerEvent<HTMLButtonElement>) => {
    if (active.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    let x = event.clientX - rect.left - rect.width / 2, y = event.clientY - rect.top - rect.height / 2;
    const distance = Math.hypot(x, y), radius = rect.width * 0.3;
    if (distance > radius) { x *= radius / distance; y *= radius / distance; }
    input.current = { x: distance < 4 ? 0 : x / radius, y: distance < 4 ? 0 : -y / radius };
    if (knob.current) knob.current.style.transform = `translate(${x}px, ${y}px)`;
  };
  const reset = () => { active.current = null; input.current = { x: 0, y: 0 }; if (knob.current) knob.current.style.transform = 'translate(0, 0)'; };
  useEffect(() => {
    window.addEventListener('blur', reset); document.addEventListener('visibilitychange', reset);
    return () => { reset(); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', reset); };
  }, []);
  return <div className="nx-joystick-wrap"><button className="nx-joystick" aria-label="Movement joystick. Drag in any direction to walk." tabIndex={-1}
    onPointerDown={event => { event.preventDefault(); active.current = event.pointerId; onFocus(); event.currentTarget.setPointerCapture(event.pointerId); update(event); }}
    onPointerMove={update} onPointerUp={reset} onPointerCancel={reset} onLostPointerCapture={reset}>
    <span className="nx-joystick-cross" /><span ref={knob} className="nx-joystick-knob"><Move size={19} /></span>
  </button><span>MOVE</span></div>;
}

export default function EventExplorer({ events }: { events: ClubEvent[] }) {
  const stations = useMemo(() => createStations(events), [events]);
  const total = String(stations.length).padStart(2, '0');
  const wrapper = useRef<HTMLElement>(null);
  const input = useRef<MoveInput>({ x: 0, y: 0 });
  const [mode, setMode] = useState<WorldMode>('overview');
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [reduced, setReduced] = useState(false);
  const [selected, setSelected] = useState<number | null>(null), [directory, setDirectory] = useState(false), [help, setHelp] = useState(false);
  const [visited, setVisited] = useState<string[]>([]);
  const [command, setCommand] = useState({ serial: 0, station: null as number | null });
  const [notice, setNotice] = useState('');
  const [snapshot, setSnapshot] = useState<WorldSnapshot>({ ...SPAWN, yaw: START_YAW, nearest: null, distance: 0, moving: false });
  const paused = selected !== null || directory || help;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const focusWorld = () => wrapper.current?.querySelector<HTMLElement>('.nx-world')?.focus({ preventScroll: true });
  function selectStation(index: number) { input.current = { x: 0, y: 0 }; setDirectory(false); setSelected(index); }
  function arrived(index: number) { setVisited(current => current.includes(stations[index].id) ? current : [...current, stations[index].id]); selectStation(index); }
  function reset() {
    setCommand(current => ({ serial: current.serial + 1, station: null }));
    setSnapshot({ ...SPAWN, yaw: START_YAW, nearest: null, distance: 0, moving: false });
    setSelected(null); setNotice('Back at the tail. Follow the gold path.');
  }
  function enter(station: number | null = null) {
    if (station !== null) {
      setCommand(current => ({ serial: current.serial + 1, station }));
      setVisited(current => current.includes(stations[station].id) ? current : [...current, stations[station].id]);
    }
    setSelected(null); setDirectory(false); setMode('explore');
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (wrapper.current?.requestFullscreen) await wrapper.current.requestFullscreen();
      else setNotice('This browser does not support fullscreen. The explorer already fits your screen.');
    } catch { setNotice('Fullscreen is unavailable. You can keep exploring here.'); }
  }
  const currentStation = snapshot.nearest !== null ? stations[snapshot.nearest] : null;

  return <section className={`nx-experience nx-${mode}`} ref={wrapper} aria-label="Inside Nucleus, an interactive event experience" data-reduced-motion={reduced}>
    <header className="nx-toolbar">
      <div className="nx-world-title"><span className="nx-live-dot" /><span>INSIDE NUCLEUS</span><span className="nx-toolbar-separator">/</span><span className="nx-muted">AN INTERACTIVE EXPERIENCE</span></div>
      <div className="nx-toolbar-actions"><div className="nx-view-toggle" aria-label="Choose view">
        <button className={mode === 'overview' ? 'is-active' : ''} aria-pressed={mode === 'overview'} onClick={() => setMode('overview')}><Layers3 size={14} /><span>Map</span></button>
        <button className={mode === 'explore' ? 'is-active' : ''} aria-pressed={mode === 'explore'} disabled={!ready || failed} onClick={() => enter()}><Compass size={14} /><span>Explore</span></button>
      </div><button className="nx-icon-button nx-fullscreen" onClick={fullscreen} aria-label="Toggle fullscreen"><Expand size={16} /></button></div>
    </header>

    <div className="nx-stage">
      {!failed && <WorldBoundary onError={() => setFailed(true)}><Suspense fallback={null}>
        <LogoWorld stations={stations} mode={mode} paused={paused} reduced={reduced} input={input} command={command}
          onReady={() => setReady(true)} onError={() => setFailed(true)} onSnapshot={setSnapshot}
          onArrive={arrived} onSelect={selectStation} />
      </Suspense></WorldBoundary>}
      <div className="nx-vignette" aria-hidden="true" />
      <div className="nx-scene-label"><span className="nx-coordinate">N / 01</span><span>{mode === 'overview' ? 'THE ARCHITECTURE OF CONNECTION' : 'FIRST-PERSON EXPLORATION'}</span></div>

      {mode === 'overview' && !failed && <>
        <div className="nx-intro"><p className="nx-kicker"><span /> OUR EXPERIENCES, REIMAGINED</p>
          <h1>Step inside<br /> the <em>Nucleus.</em></h1>
          <p className="nx-intro-copy">A familiar shape. A whole new world.<br /> Find your way through our logo and discover<br className="nx-desktop-break" /> what happens when curious minds connect.</p>
          <div className="nx-intro-action"><button className="nx-enter" onClick={() => enter()} disabled={!ready}>
            {ready ? <><span>Enter the Nucleus</span><ArrowUpRight size={20} /></> : <><span>Building your world</span><LoaderCircle size={18} className="spin" /></>}
          </button><span>BEGIN AT THE TAIL <span aria-hidden="true">↗</span></span></div>
          <button className="nx-plain-button nx-browse-link" onClick={() => setDirectory(true)}>Or browse the stations <ArrowRight size={14} /></button>
        </div>
        <div className="nx-map-annotation" aria-hidden="true"><span className="nx-annotation-line" /><span>ONE LOGO.<br />ENDLESS CONNECTIONS.</span></div>
        <div className="nx-map-hint"><MousePointer2 size={13} /><span>Drag to rotate <b>·</b> Select a numbered station</span></div>
        <div className="nx-world-scale" aria-hidden="true"><span /><span />NUCLEUS / SPATIAL EDITION 001</div>
      </>}

      {failed && <div className="nx-fallback" role="status"><img src={logoUrl} alt="Nucleus club logo" /><p className="nx-kicker">THE CONNECTION CONTINUES</p><h1>Explore the stations.</h1><p>The 3D world couldn’t load in this browser.<br />You can still open every event template below.</p><div>{stations.map(station => <button key={station.id} onClick={() => selectStation(station.index)}><span>{station.number}</span>{station.name}<ArrowUpRight size={15} /></button>)}</div></div>}

      {mode === 'explore' && !failed && <>
        <div className="nx-location"><span className="nx-kicker">{currentStation ? `STATION ${currentStation.number}` : 'FOLLOW YOUR CURIOSITY'}</span><h1>{currentStation ? currentStation.name : 'You’re inside.'}</h1><p>{currentStation ? 'Stay a moment to discover this station.' : 'Follow the gold line. Find your next connection.'}</p></div>
        <Minimap stations={stations} snapshot={snapshot} visited={visited} onOpen={() => setMode('overview')} />
        <span className="nx-crosshair" aria-hidden="true" />
        {currentStation && !paused && <button className="nx-near-station" onClick={() => arrived(currentStation.index)}><span className="nx-station-orbit" /><span>{snapshot.moving ? 'Stop here to explore' : 'Explore this station'}<small>Or tap here / press E</small></span><ArrowRight size={17} /></button>}
        <div className="nx-desktop-controls" id="nx-control-summary"><div className="nx-key-cluster"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></div><p>Move freely<span>Drag to look <b>·</b> ← → to turn <b>·</b> L to lock mouse</span></p></div>
        {!paused && <Joystick input={input} onFocus={focusWorld} />}
        <div className="nx-touch-look"><ScanLine size={20} /><span>DRAG TO LOOK</span></div>
        <button className="nx-return-tail" onClick={reset}><RotateCcw size={14} /><span>Back to tail</span></button>
      </>}
      {notice && <div className="nx-notice" role="status">{notice}</div>}
    </div>

    <footer className="nx-bottom-bar">
      <button className="nx-stations-button" onClick={() => setDirectory(true)}><List size={16} /><span>The stations</span><span className="nx-station-count">{total}</span></button>
      <div className="nx-journey" aria-label={`${visited.length} of ${stations.length} stations visited`}><span className="nx-journey-dots">{stations.slice(0, 12).map(station => <i key={station.id} className={visited.includes(station.id) ? 'is-visited' : ''} />)}</span><span>{String(visited.length).padStart(2, '0')} <span className="nx-muted">/ {total} DISCOVERED</span></span></div>
      <div className="nx-footer-actions"><a className="nx-add-event" href="/admin?tab=events&action=add" target="_blank" rel="noreferrer"><Plus size={14} />Add event</a><button className="nx-help-button" onClick={() => setHelp(true)}><span>?</span>How to explore</button></div>
    </footer>

    {directory && <ExplorerDialog label="Station directory" onClose={() => setDirectory(false)} className="nx-directory">
      <div className="nx-panel-top"><span className="nx-kicker">PLACES TO CONNECT</span><button className="nx-icon-button" onClick={() => setDirectory(false)} aria-label="Close station directory"><X size={19} /></button></div>
      <h2>Choose your<br /><em>next connection.</em></h2><p className="nx-panel-lead">Every room is a place for something new.<br />Choose a stop to discover its event or workshop.</p>
      <div className="nx-directory-list">{stations.map(station => <button key={station.id} onClick={() => selectStation(station.index)}><span className="nx-directory-number">{station.number}</span><span>{station.name}<small>{station.event?.category || 'EVENT / WORKSHOP PLACEHOLDER'}</small></span>{visited.includes(station.id) ? <Check size={17} aria-label="Visited" /> : <ArrowUpRight size={17} />}</button>)}</div>
      <p className="nx-directory-note"><span className="nx-live-dot" /> Take your time. Explore in any order.</p>
    </ExplorerDialog>}

    {selected !== null && <ExplorerDialog label={`Station ${stations[selected].number} event template`} onClose={() => setSelected(null)} className="nx-station-panel">
      <div className="nx-panel-top"><span className="nx-kicker">CONNECTION {stations[selected].number} <span className="nx-muted">/ {total}</span></span><button className="nx-icon-button" onClick={() => setSelected(null)} aria-label="Close event template"><X size={19} /></button></div>
      <div className="nx-panel-room"><span className="nx-live-dot" />{stations[selected].name}<span>YOU’VE ARRIVED</span></div>
      <div className="nx-image-placeholder"><div className="nx-photo-corners" /><ImageIcon size={32} strokeWidth={1} /><span>YOUR NEXT MEMORY GOES HERE</span><small>Event image</small><span className="nx-image-index">/{stations[selected].number}</span></div>
      <div className="nx-template-label">{stations[selected].event?.category || 'EVENT / WORKSHOP'} <span>{stations[selected].event ? 'THE EXPERIENCE' : 'COMING SOON'}</span></div>
      <h2>{stations[selected].event?.title || <>Event title<br /><em>goes here.</em></>}</h2><p className="nx-template-copy">{stations[selected].event?.description || 'A space for the story, the idea, and everything you’ll take away from this experience.'}</p>
      <div className="nx-template-details"><div><CalendarDays size={17} /><span>DATE & TIME<small>{stations[selected].event ? new Date(stations[selected].event!.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) + ' IST' : 'To be announced'}</small></span></div><div><MapPin size={17} /><span>LOCATION<small>{stations[selected].event?.location || 'To be announced'}</small></span></div></div>
      <p className="nx-template-note">{stations[selected].event ? 'A connection worth making.' : 'This station is waiting for its first story.'}</p>
      <button className="nx-enter nx-panel-continue" onClick={() => {
        if (failed) { setSelected(null); setDirectory(true); }
        else if (mode === 'overview') enter(selected);
        else setSelected(null);
      }}>{failed ? 'Back to stations' : mode === 'overview' ? 'Explore from this station' : 'Continue exploring'}<ArrowRight size={18} /></button>
    </ExplorerDialog>}

    {help && <ExplorerDialog label="How to explore" onClose={() => setHelp(false)} className="nx-help-panel">
      <div className="nx-panel-top"><span className="nx-kicker">A LITTLE CURIOSITY IS ALL YOU NEED</span><button className="nx-icon-button" onClick={() => setHelp(false)} aria-label="Close exploration help"><X size={19} /></button></div>
      <h2>Make yourself<br /><em>at home.</em></h2>
      <div className="nx-help-steps"><div><Compass /><span><strong>Start at the tail.</strong>Enter the logo and follow the gold line through its rooms.</span></div><div><Move /><span><strong>Find your own way.</strong>Use W A S D to walk. Drag to look, or turn with the left and right arrow keys. On touchscreens, use the joystick and drag the scene with your other hand.</span></div><div><MapPin /><span><strong>Pause at a station.</strong>Stop inside a gold ring to open its event panel. You can also press E or tap the station prompt.</span></div><div><Layers3 /><span><strong>Keep your bearings.</strong>Open the map or return to the tail at any time. Browse stations directly if you prefer.</span></div></div>
      <p className="nx-help-note">On desktop, press L while exploring to lock the mouse. Escape releases it. Movement pauses whenever a panel is open.</p>
      <button className="nx-enter" onClick={() => setHelp(false)}>Ready to explore<ArrowRight size={18} /></button>
    </ExplorerDialog>}
  </section>;
}
