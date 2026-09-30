'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import CoreDeck from './CoreDeck';
import NavCardsSection from './NavCardsSection';
import MemberProfileOverlay from './MemberProfileOverlay';
import TeamShell from './TeamShell';
import type { CoreMember, TeamShowcaseProps } from './types';
import './team-showcase.css';

export default function TeamShowcase({ clubName, core }: TeamShowcaseProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const [selected, setSelected] = useState<CoreMember | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Restore real document scrolling; the deck always follows the scroll position.
    const frame = requestAnimationFrame(() => {
      if (['#navigation-cards', '#navigation'].includes(window.location.hash)) {
        document.getElementById('navigation-cards')?.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else if (Number.isFinite(window.history.state?.peopleScrollY)) {
        window.scrollTo({ top: window.history.state.peopleScrollY, behavior: 'instant' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const selectMember = useCallback((member: CoreMember) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(member);
  }, []);

  return (
    <TeamShell clubName={clubName} cta={{ href: '#navigation-cards', label: 'Explore the people' }} skipTarget="core-team-deck">
      <main data-reduced-motion={reducedMotion ? 'true' : undefined}>
        <CoreDeck
          core={core}
          onSelect={selectMember}
          reducedMotion={reducedMotion}
        />
        <NavCardsSection reducedMotion={reducedMotion} />
      </main>
      <AnimatePresence>
        {selected && (
          <MemberProfileOverlay
            key={selected.id}
            member={selected}
            index={core.findIndex(member => member.id === selected.id)}
            total={core.length}
            group="THE CORE"
            clubName={clubName}
            reducedMotion={reducedMotion}
            returnFocus={returnFocus.current}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </TeamShell>
  );
}
