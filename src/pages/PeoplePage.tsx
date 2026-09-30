import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowUpRight, RotateCcw } from 'lucide-react';
import type { Member } from '../types';
import { memberProgress, sortTowerMembers } from '../lib/people-tower-motion';
import './showcase.css';
import './people-tower.css';

export default function PeoplePage({ members }: { members: Member[] }) {
  const sorted = useMemo(
    () => sortTowerMembers(members),
    [members],
  );
  const story = useRef<HTMLDivElement>(null), host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'still' | 'fallback'>('loading');
  const [active, setActive] = useState(-1);
  const memberKey = JSON.stringify(sorted);
  const controller = useRef<{ rebuild: () => void } | null>(null);
  useEffect(() => {
    const element = host.current, section = story.current;
    if (!element || !section || !sorted.length) { setStatus('still'); return; }
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false, generation = 0;
    let cleanup: (() => void) | undefined;
    async function start() {
      const current = ++generation;
      cleanup?.(); cleanup = undefined; controller.current = null; setActive(-1);
      if (media.matches) { setStatus('still'); return; }
      setStatus('loading');
      try {
        const { createPeopleTower } = await import('../lib/people-tower');
        if (disposed || current !== generation) return;
        const tower = createPeopleTower(element!, section!, sorted, {
          onMember: setActive,
          onError: () => {
            if (!disposed && current === generation) {
              cleanup?.(); cleanup = undefined; controller.current = null; setStatus('fallback'); setActive(-1);
            }
          },
        });
        cleanup = tower.dispose; controller.current = tower;
        setStatus('ready');
      } catch {
        if (!disposed && current === generation) { cleanup?.(); cleanup = undefined; controller.current = null; setStatus('fallback'); }
      }
    }
    void start(); media.addEventListener('change', start);
    return () => { disposed = true; generation++; media.removeEventListener('change', start); cleanup?.(); controller.current = null; };
    // Equivalent API refreshes should preserve the current scene.
  }, [memberKey]);
  function revealMember(index: number) {
    const section = story.current;
    if (!section || status !== 'ready') return;
    const stage = section.querySelector<HTMLElement>('.people-tower__stage')!;
    const header = parseFloat(getComputedStyle(stage).top) || 0;
    const top = section.getBoundingClientRect().top + scrollY - header;
    window.scrollTo({ top: top + memberProgress(index, sorted.length) * (section.offsetHeight - stage.offsetHeight), behavior: 'instant' });
    section.querySelector<HTMLSelectElement>('select')?.focus({ preventScroll: true });
  }
  return <section className="people-page" aria-labelledby="people-title" data-tower-status={status}>
    <h1 id="people-title" className="sr-only">The people behind Nucleus</h1>
    <div className="people-tower" ref={story} style={{ '--tower-length': `${sorted.length * 145 + 180}svh` } as CSSProperties}>
      <div className="people-tower__stage">
        <div className="people-tower__world" ref={host} aria-hidden="true" />
        <div className="people-tower__topline"><span className="eyebrow">02 / The people</span><a href="#team-roster" className="people-tower__skip">View all members <ArrowDown size={14} /></a></div>
        <div className="people-tower__finish" aria-hidden="true"><p>The<br /><em>whole team.</em></p><span>Meet everyone <ArrowDown size={15} /></span></div>
        <p className="people-tower__hint" hidden={status !== 'ready'}>Click a block to pull it out. Drag to play. Scroll to meet the team.</p>
        <div className="people-tower__hud" hidden={status !== 'ready'}>
          <div className="people-tower__counter"><span>{active < 0 ? '—' : String(active + 1).padStart(2, '0')}</span><span>/ {String(sorted.length).padStart(2, '0')}</span></div>

          <label className="people-tower__picker"><span className="sr-only">Jump to a member</span><select value={active < 0 ? '' : active} onChange={event => revealMember(Number(event.target.value))}><option value="" disabled>Meet the members</option>{sorted.map((member, index) => <option key={member.id} value={index}>{member.name}</option>)}</select></label>
          <button className="people-tower__rebuild" onClick={() => controller.current?.rebuild()}><RotateCcw size={14} /><span>Rebuild tower</span></button>
        </div>
      </div>
    </div>
    <div className="people-roster section-wrap" id="team-roster">
      <div className="people-roster__heading"><div><span className="eyebrow">The whole nucleus</span><h2>Stronger <em>together.</em></h2></div><span className="eyebrow">{sorted.length} people · One community</span></div>
      <div className="people-roster__grid">{sorted.map((member, index) => <article className="people-roster__member" key={member.id}>
        <div className="people-roster__initials" aria-hidden="true">{member.initials}</div><span className="people-roster__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{member.name}</h3><p>{member.role}</p>
        {status === 'ready' && <button onClick={() => revealMember(index)} className="people-roster__reveal" aria-label={`Show ${member.name} in the tower`}><ArrowUpRight size={19} /></button>}
      </article>)}</div>
      {!sorted.length && <div className="empty-state">The team will be announced here soon.</div>}

    </div>
  </section>;
}
