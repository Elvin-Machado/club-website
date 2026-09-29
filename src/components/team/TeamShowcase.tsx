'use client';

import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import CoreOrbit from './CoreOrbit';
import MemberProfileOverlay from './MemberProfileOverlay';
import NavCardsSection from './NavCardsSection';
import TeamShell from './TeamShell';
import type { CoreMember, TeamShowcaseProps } from './types';
import './team-showcase.css';

export default function TeamShowcase({ clubName, core }: TeamShowcaseProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const [selected, setSelected] = useState<CoreMember | null>(null);
  const constellationRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const orbitVisible = useInView(constellationRef);
  // Normal document scrolling; the complete first screen never needs a pin.
  const { scrollYProgress } = useScroll({ target: constellationRef, offset: ['start start', 'end start'] });
  const opacity = useTransform(scrollYProgress, [0.12, 0.85], reducedMotion ? [1, 1] : [1, 0.45]);
  const scale = useTransform(scrollYProgress, [0.12, 0.85], reducedMotion ? [1, 1] : [1, 0.97]);

  const selectMember = useCallback((member: CoreMember) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(member);
  }, []);

  return <TeamShell clubName={clubName} cta={{ href: '#navigation-cards', label: 'Explore the people' }} skipTarget="constellation">
    <main data-reduced-motion={reducedMotion ? 'true' : undefined}>
      <section ref={constellationRef} id="constellation" className="constellation-section" aria-labelledby="galaxy-title" tabIndex={-1}>
        <motion.div className="constellation-content-wrap" style={{ opacity, scale }}>
          <CoreOrbit core={core} selectedId={selected?.id ?? null} onSelect={selectMember} active={orbitVisible} reducedMotion={reducedMotion} />
        </motion.div>
        <a className="galaxy-scroll" href="#navigation-cards">EXPLORE THE COMMUNITY <ArrowDown size={15} aria-hidden="true" /></a>
      </section>
      <NavCardsSection reducedMotion={reducedMotion} />
    </main>
    <AnimatePresence>{selected && <MemberProfileOverlay
      key={selected.id} member={selected} index={core.findIndex(member => member.id === selected.id)} total={core.length}
      group="THE CORE" clubName={clubName} reducedMotion={reducedMotion} returnFocus={returnFocus.current} onClose={() => setSelected(null)}
    />}</AnimatePresence>
  </TeamShell>;
}
