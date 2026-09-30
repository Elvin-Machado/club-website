'use client';

import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import MemberProfileOverlay from './MemberProfileOverlay';
import CommunitySection from './CommunitySection';
import TeamShell from './TeamShell';
import { TeamLink as Link } from './TeamNavigation';
import type { ClubMember, TeamShowcaseProps } from './types';
import './team-showcase.css';

export default function MembersShowcase({ clubName, members }: Pick<TeamShowcaseProps, 'clubName' | 'members'>) {
  const reducedMotion = Boolean(useReducedMotion());
  const [selected, setSelected] = useState<ClubMember | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const selectMember = useCallback((member: ClubMember) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(member);
  }, []);

  return <TeamShell clubName={clubName} cta={{ href: '/team#navigation-cards', label: 'Back to The People' }} skipTarget="community">
    <main className="team-destination" data-reduced-motion={reducedMotion ? 'true' : undefined}>
      <Link href="/team#navigation-cards" className="team-back-link"><ArrowLeft size={16} aria-hidden="true" /> Back to The People</Link>
      <CommunitySection members={members} onSelect={selectMember} reducedMotion={reducedMotion} />
    </main>
    <AnimatePresence>{selected && <MemberProfileOverlay
      key={selected.id} member={selected} index={members.findIndex(member => member.id === selected.id)} total={members.length}
      group="THE COMMUNITY" clubName={clubName} reducedMotion={reducedMotion} returnFocus={returnFocus.current} onClose={() => setSelected(null)}
    />}</AnimatePresence>
  </TeamShell>;
}
