'use client';

import { useCallback, useRef, useState } from 'react';
import { TeamLink as Link } from './TeamNavigation';
import { ArrowLeft } from 'lucide-react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import TeamShell from './TeamShell';
import AlumniSection from './AlumniSection';
import MemberProfileOverlay from './MemberProfileOverlay';
import { alumniMembers } from './alumni-data';
import type { AlumniMember } from './types';
import './team-showcase.css';

export default function AlumniShowcase({ clubName }: { clubName: string }) {
  const reducedMotion = Boolean(useReducedMotion());
  const [selected, setSelected] = useState<AlumniMember | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  const select = useCallback((member: AlumniMember) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(member);
    setProfileVisible(true);
  }, []);

  const close = useCallback(() => {
    setSelected(null);
    setProfileVisible(false);
  }, []);

  return <TeamShell clubName={clubName} cta={{ href: '/team#navigation-cards', label: 'Back to The People' }} skipTarget="alumni">
    <main className="team-destination" data-reduced-motion={reducedMotion ? 'true' : undefined}>
      <Link href="/team#navigation-cards" className="team-back-link"><ArrowLeft size={16} aria-hidden="true" /> Back to The People</Link>
      <AlumniSection members={alumniMembers} reducedMotion={reducedMotion} onSelect={select} asPrimary />

      <AnimatePresence>{selected && profileVisible && <MemberProfileOverlay key={selected.id} member={selected} index={alumniMembers.findIndex(member => member.id === selected.id)} total={alumniMembers.length} group="ALUMNI" clubName={clubName} reducedMotion={reducedMotion} returnFocus={returnFocus.current} onClose={close} />}</AnimatePresence>
    </main>
  </TeamShell>;
}
