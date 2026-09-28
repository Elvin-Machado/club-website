'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import type { ClubMember } from './types';
import MemberPhoto from './MemberPhoto';

interface MemberDeckProps {
  members: ClubMember[];
  onSelect: (member: ClubMember) => void;
  onShowAll: () => void;
  reducedMotion: boolean;
}

export default function MemberDeck({ members, onSelect, onShowAll, reducedMotion }: MemberDeckProps) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const total = members.length;

  const goTo = useCallback((index: number) => {
    setActive(Math.max(0, Math.min(total - 1, index)));
  }, [total]);

  // Only scroll the track horizontally, and only after the user has engaged
  // with the deck. `scrollIntoView` on mount would drag the whole page down
  // to the deck before anyone has scrolled.
  const engaged = useRef(false);
  useEffect(() => {
    if (!engaged.current) return;
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[active] as HTMLElement | undefined;
    if (!child) return;
    const left = child.offsetLeft - (track.clientWidth - child.clientWidth) / 2;
    track.scrollTo({ left, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [active, reducedMotion]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(active + 1);
      if (e.key === 'ArrowLeft') goTo(active - 1);
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [active, goTo]);

  // Touch / drag support
  const startX = useRef(0);
  const onPointerDown = useCallback((e: React.PointerEvent) => { startX.current = e.clientX; }, []);
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 40) { engaged.current = true; goTo(active + (dx < 0 ? 1 : -1)); }
  }, [active, goTo]);
  const step = useCallback((delta: number) => { engaged.current = true; goTo(active + delta); }, [active, goTo]);

  if (!members.length) return null;

  return <section className="member-deck team-section" id="community" aria-labelledby="deck-heading">
    <div className="team-section-top"><span className="team-kicker"><span className="team-section-index">02</span> THE COMMUNITY</span><span className="team-kicker text-zinc-500">{String(total).padStart(2, '0')} MINDS IN THE CONSTELLATION</span></div>
    <div className="team-section-heading">
      <motion.h2 id="deck-heading" initial={reducedMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.65 }} tabIndex={-1}>Meet the<br /><span>community.</span></motion.h2>
      <p>Different skills, shared curiosity. The people who turn a community into a force.</p>
    </div>

    <div className="deck-viewport" ref={trackRef} role="group" aria-roledescription="carousel" aria-label="Community members"
      onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      {members.map((member, i) => {
        const offset = i - active;
        const abs = Math.abs(offset);
        return <motion.article key={member.id} className={`deck-card ${i === active ? 'is-active' : ''}`}
          role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${total}`}
          animate={{ opacity: reducedMotion ? 1 : 1 - abs * 0.2, scale: 1 - abs * 0.06, rotateY: reducedMotion ? 0 : offset * -2, z: -abs * 30 }}
          transition={{ duration: reducedMotion ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => onSelect(member)}>
          <span className="deck-card-top"><span className="team-kicker">NUCLEUS / PEOPLE</span><span>{String(i + 1).padStart(2, '0')}</span></span>
          <div className="deck-card-portrait" aria-hidden="true"><MemberPhoto src={member.image} name={member.name} sizes="(max-width:767px) 80vw, 30vw" /></div>
          <h3 className="deck-card-name">{member.name}</h3>
          <p className="deck-card-role">{member.role}</p>
          <span className="deck-card-cta">Learn more <ArrowUpRight size={15} /></span>
        </motion.article>;
      })}
    </div>

    <div className="deck-controls">
      <span className="team-kicker">{String(active + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      <div className="deck-nav">
        <button className="team-icon-button" aria-label="Previous member" disabled={active === 0} onClick={() => step(-1)}><ChevronLeft size={17} /></button>
        <button className="team-icon-button" aria-label="Next member" disabled={active === total - 1} onClick={() => step(1)}><ChevronRight size={17} /></button>
      </div>
      <button className="deck-explore-all" onClick={onShowAll}><LayoutGrid size={15} /> Explore all members</button>
    </div>
  </section>;
}
