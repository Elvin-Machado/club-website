import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Expand, Layers3, List, MapPin, Pause, Play, RotateCcw, VolumeX } from 'lucide-react';
import type { ClubEvent } from '../types';

const BrainRide = lazy(() => import('./BrainRide'));
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
const date = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
function eventStatus(event: ClubEvent) { return new Date(event.endsAt || event.startsAt).getTime() < Date.now() ? 'Past experience' : 'Upcoming experience'; }

export default function EventExplorer({ events }: { events: ClubEvent[] }) {
  const [view, setView] = useState<'ride' | 'list'>('ride'), [selected, setSelected] = useState(0), [playing, setPlaying] = useState(false), [overview, setOverview] = useState(true);
  const [near, setNear] = useState(false), [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [progress, setProgress] = useState(0), [reduced, setReduced] = useState(false), [atStation, setAtStation] = useState(false), [fullscreenError, setFullscreenError] = useState('');
  const wrapper = useRef<HTMLDivElement>(null);
  const [requestId, setRequestId] = useState(0);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { setReduced(media.matches); if (media.matches) { setView('list'); setPlaying(false); } }; change();
    media.addEventListener('change', change);
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNear(true); observer.disconnect(); } }, { rootMargin: '250px' });
    if (wrapper.current) observer.observe(wrapper.current);
    return () => { observer.disconnect(); media.removeEventListener('change', change); };
  }, []);
  useEffect(() => { if (selected >= events.length) setSelected(0); }, [events.length, selected]);
  function travel(index: number) { setSelected((index + events.length) % events.length); setRequestId(id => id + 1); setOverview(false); setAtStation(false); setPlaying(!reduced); }
  async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await wrapper.current?.requestFullscreen(); } catch { setFullscreenError('Fullscreen is unavailable in this browser. You can continue exploring below.'); } }
  const event = events[selected];
  const fail = () => { setFailed(true); setView('list'); setPlaying(false); };
  return <div className="event-explorer" ref={wrapper}>
    <div className="explorer-toolbar"><span className="explorer-title"><span className="status-dot" /> THE NEURAL EXPRESS <span className="muted">/ INTERACTIVE EXPERIENCE</span></span><div className="explorer-view-controls"><div className="view-switch" aria-label="Event view"><button className={view === 'ride' ? 'active' : ''} onClick={() => { if (view !== 'ride') { setView('ride'); setOverview(true); setReady(false); } }} aria-pressed={view === 'ride'} disabled={failed}><Layers3 size={15} />3D ride</button><button className={view === 'list' ? 'active' : ''} onClick={() => { setView('list'); setPlaying(false); }} aria-pressed={view === 'list'}><List size={15} />List view</button></div><button className="icon-button fullscreen-button" onClick={fullscreen} aria-label="Toggle fullscreen event explorer"><Expand size={15} /></button></div></div>
    {fullscreenError && <p className="scene-notice" role="status">{fullscreenError}</p>}
    {!events.length ? <div className="empty-state"><h3>The next connection is taking shape.</h3><p>New events will appear here as they’re announced.</p></div> : view === 'list' ? <div className="event-list">{failed && <p className="scene-notice" role="status">Your browser couldn’t start the 3D scene. All events are available below.</p>}{reduced && <p className="scene-notice">Showing the list to respect your reduced-motion preference. You can also explore the static 3D overview.</p>}{events.map((item, i) => <article key={item.id} className="event-list-item"><span className="event-list-index">{String(i + 1).padStart(2, '0')}</span><div><span className="eyebrow">{item.category} · {eventStatus(item)}</span><h3>{item.title}</h3><p>{item.description}</p><div className="event-details"><span><CalendarDays size={15} />{date(item.startsAt)}</span><span><MapPin size={15} />{item.location}</span></div>{item.registrationUrl && eventStatus(item) === 'Upcoming experience' && <a className="text-link" href={item.registrationUrl} target="_blank" rel="noreferrer">Register <ArrowUpRight size={16} /></a>}</div></article>)}</div> : <>
      <div className="ride-layout"><div className="scene-container">
        {near && <SceneBoundary onError={fail}><Suspense fallback={<div className="scene-placeholder"><div className="scene-loading-orbit" /><span>Building your neural landscape…</span></div>}><BrainRide events={events} selected={selected} requestId={requestId} playing={playing} overview={overview} reduced={reduced} onReady={() => setReady(true)} onError={fail} onArrive={() => { setPlaying(false); setAtStation(true); }} onProgress={setProgress} onStationClick={travel} /></Suspense></SceneBoundary>}
        <div className="scene-topline"><span><i />{overview ? 'ORBIT VIEW' : playing ? 'EXPLORING THE NETWORK' : 'AT THE STATION'}</span><span>NEURAL SPACE / 001</span></div>
        {ready && overview && <div className="ride-invitation"><span className="eyebrow">A JOURNEY THROUGH OUR CONNECTIONS</span><h3>All aboard<br />the neural express.</h3><button className="button primary" onClick={() => { setOverview(false); setPlaying(!reduced); }}> {reduced ? 'Explore this station' : 'Begin the ride'}<Play size={16} fill="currentColor" /></button><p>{reduced ? 'Reduced motion · static station views' : 'You’re in control. Pause or exit any time.'}</p></div>}
        <div className="scene-bottomline"><span>{overview ? 'DRAG TO ORBIT · SELECT A STATION' : 'YOUR JOURNEY · YOUR PACE'}</span><span><VolumeX size={13} /> NO AUDIO</span></div>
      </div><aside className="station-card" aria-live="polite" aria-atomic="true"><div className="station-card-header"><span className="eyebrow">CONNECTION {String(selected + 1).padStart(2, '0')}</span><span>{String(events.length).padStart(2, '0')} STOPS</span></div><div className="station-symbol" aria-hidden="true">{['✳', '✧', '↗'][selected % 3]}</div><span className="station-category">{event.category}</span><h3>{event.title}</h3><p>{event.description}</p><div className="station-details"><span><CalendarDays size={16} />{date(event.startsAt)}<small>{new Date(event.startsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST</small></span><span><MapPin size={16} />{event.location}</span></div><div className="station-footer"><span className="status-label"><i />{eventStatus(event)}</span>{event.registrationUrl && eventStatus(event) === 'Upcoming experience' ? <a href={event.registrationUrl} target="_blank" rel="noreferrer" className="text-link">Register <ArrowUpRight size={15} /></a> : <span className="muted small">Part of our story.</span>}</div></aside></div>
      <div className="ride-controls"><div className="playback-controls"><button className="icon-button" aria-label="Previous event" onClick={() => travel(selected - 1)}><ChevronLeft size={19} /></button><button className="ride-play" disabled={!ready || reduced} aria-label={playing ? 'Pause ride' : atStation ? 'Ride to next event' : 'Resume ride'} onClick={() => { if (playing) setPlaying(false); else if (atStation) travel(selected + 1); else { setOverview(false); setPlaying(true); } }}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button><button className="icon-button" aria-label="Next event" onClick={() => travel(selected + 1)}><ChevronRight size={19} /></button></div><div className="station-timeline" aria-label="Choose an event">{events.map((item, i) => <button key={item.id} className={i === selected ? 'selected' : ''} aria-label={`Go to ${item.title}`} aria-pressed={i === selected} onClick={() => travel(i)}><i /><span>{String(i + 1).padStart(2, '0')}</span></button>)}<div className="timeline-line" /></div><button className="overview-button" onClick={() => { setOverview(true); setPlaying(false); setAtStation(false); }}><RotateCcw size={15} />Reset view</button><span className="ride-progress">{Math.round(progress * 100)}<small>%</small></span></div>
    </>}
    <div className="explorer-caption"><span><span className="tiny-star">✳</span> Different experiences. New connections.</span><span>EXPLORE AT YOUR OWN PACE <ArrowRight size={13} /></span></div>
  </div>;
}
