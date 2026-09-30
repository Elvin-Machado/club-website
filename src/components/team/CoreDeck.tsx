'use client';

import { useRef, type CSSProperties } from 'react';
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import MemberPhoto from './MemberPhoto';
import type { CoreMember } from './types';

interface CoreDeckProps {
  core: CoreMember[];
  onSelect: (member: CoreMember) => void;
  reducedMotion: boolean;
}

function CoreMemberCard({ member, index, total, onSelect }: {
  member: CoreMember; index: number; total: number; onSelect: (member: CoreMember) => void;
}) {
  return <button type="button" className="core-card-surface-full"
    onClick={() => onSelect(member)}
    aria-label={`${member.name}, ${member.role} — NUCLEUS CORE TEAM`} aria-haspopup="dialog" data-member-id={member.id}>
    <span className="core-card-photo-area" aria-hidden="true">
      <MemberPhoto src={member.image} name={member.name} sizes="(max-width: 767px) 80vw, 400px" priority={index === 0} />
      <span className="core-card-full-overlay" />
      <span className="core-card-badge">{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
    </span>
    <span className="core-card-bottom-content">
      <span className="team-kicker"><span className="team-signal" aria-hidden="true" />NUCLEUS CORE TEAM</span>
      <span className="core-card-name">{member.name}</span>
      <span className="core-card-role">{member.role}</span>
    </span>
    <ArrowUpRight className="core-card-open-icon" size={20} aria-hidden="true" />
  </button>;
}

function ArchedFanMemberCard({ member, index, total, progress, onSelect }: {
  member: CoreMember; index: number; total: number; progress: MotionValue<number>; onSelect: (member: CoreMember) => void;
}) {
  const activeIndex = useTransform(progress, [0, 0.94], [0, total - 1]);
  const offset = useTransform(activeIndex, current => {
    let distance = index - current;
    if (distance > total / 2) distance -= total;
    if (distance < -total / 2) distance += total;
    return distance;
  });
  // Keep cards in a single stacking plane so every exposed card can be clicked.
  const rotate = useTransform(offset, value => value * 7);
  const x = useTransform(offset, value => `calc(${value} * var(--core-card-step))`);
  const y = useTransform(offset, value => Math.abs(value) * 22);
  const scale = useTransform(offset, value => Math.max(0.76, 1 - Math.abs(value) * 0.1));
  const opacity = useTransform(offset, value => Math.max(0, 1 - Math.abs(value) * 0.32));
  const zIndex = useTransform(offset, value => Math.round(100 - Math.abs(value) * 10));
  const visibility = useTransform(opacity, value => value > 0.01 ? 'visible' : 'hidden');
  const pointerEvents = useTransform(opacity, value => value > 0.01 ? 'auto' : 'none');

  return <motion.li className="core-card-wrapper" style={{ rotate, x, y, scale, opacity, zIndex, visibility, pointerEvents }}>
    <CoreMemberCard member={member} index={index} total={total} onSelect={onSelect} />
  </motion.li>;
}

function AnimatedCoreDeck({ core, onSelect }: Omit<CoreDeckProps, 'reducedMotion'>) {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 32, restDelta: 0.001 });

  return <section ref={containerRef} id="core-team-deck" className="core-deck-section"
    aria-labelledby="core-deck-heading" tabIndex={-1} style={{ '--core-count': core.length } as CSSProperties}>
    <div className="core-deck-sticky">
      <div className="core-deck-backdrop-glow" aria-hidden="true" />
      <div className="core-deck-top-bar">
        <h1 id="core-deck-heading" className="team-kicker"><span className="team-signal" />The people / Core team</h1>
        <span className="core-deck-scroll-hint">Scroll to explore <ChevronDown size={14} aria-hidden="true" /></span>
      </div>
      <ul className="core-deck-viewport">
        {core.map((member, index) => <ArchedFanMemberCard key={member.id} member={member} index={index}
          total={core.length} progress={progress} onSelect={onSelect} />)}
      </ul>
      <div className="core-deck-logo-strip">
        <img src="/NucleusLogo_transparent.png" alt="" className="core-deck-logo-img" aria-hidden="true" />
        <p className="core-deck-tagline">Different minds. One Nucleus.</p>
      </div>
    </div>
  </section>;
}

export default function CoreDeck({ core, onSelect, reducedMotion }: CoreDeckProps) {
  if (!reducedMotion) return <AnimatedCoreDeck core={core} onSelect={onSelect} />;

  return <section id="core-team-deck" className="core-deck-reduced" aria-labelledby="core-deck-heading" tabIndex={-1}>
    <div className="core-deck-heading-reduced"><span className="team-kicker">NUCLEUS CORE TEAM</span><h1 id="core-deck-heading">The people behind Nucleus.</h1></div>
    <ul className="core-deck-list-reduced">{core.map((member, index) => <li key={member.id}><CoreMemberCard
      member={member} index={index} total={core.length} onSelect={onSelect} /></li>)}</ul>
  </section>;
}
