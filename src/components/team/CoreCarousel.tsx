'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import MemberPhoto from './MemberPhoto';
import type { CoreMember } from './types';

export default function CoreCarousel({ core, onSelect, reducedMotion }: { core: CoreMember[]; onSelect: (member: CoreMember) => void; reducedMotion: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  function goTo(index: number) {
    const element = track.current;
    const slide = element?.children[index] as HTMLElement | undefined;
    if (element && slide) element.scrollTo({ left: slide.offsetLeft - element.offsetLeft, behavior: reducedMotion ? 'instant' : 'smooth' });
  }
  return <div className="core-carousel" role="region" aria-roledescription="carousel" aria-label="Core team">
    <div ref={track} className="core-carousel-track" onScroll={() => {
      if (!track.current) return;
      const width = (track.current.children[0] as HTMLElement)?.offsetWidth + 16;
      if (width) setActive(Math.min(core.length - 1, Math.round(track.current.scrollLeft / width)));
    }}>{core.map((member, index) => <article className="core-carousel-slide" key={member.id} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${core.length}`}>
      <button onClick={() => onSelect(member)} className="core-carousel-button" aria-label={`Meet ${member.name}, ${member.role}`} aria-haspopup="dialog">
        <span className="team-kicker carousel-coordinate">CORE / {String(index + 1).padStart(2, '0')}</span>
        <div className="carousel-portrait-frame" aria-hidden="true">
          <MemberPhoto src={member.image} name={member.name} sizes="140px" />
        </div>
        <span className="carousel-member-name">{member.name}</span><span className="carousel-member-role">{member.role}</span>
        <span className="carousel-discover">Meet this mind <ArrowUpRight size={16} /></span>
      </button>
    </article>)}</div>
    <div className="carousel-controls"><span className="team-kicker" aria-live="polite">{String(active + 1).padStart(2, '0')} <span className="text-zinc-600">/ {String(core.length).padStart(2, '0')}</span></span><div className="carousel-dots">{core.map((member, index) => <button key={member.id} aria-label={`Go to ${member.name}`} aria-current={active === index ? 'true' : undefined} onClick={() => goTo(index)}><span /></button>)}</div><div className="flex gap-2"><button className="team-icon-button" aria-label="Previous member" disabled={active === 0} onClick={() => goTo(active - 1)}><ChevronLeft size={17} /></button><button className="team-icon-button" aria-label="Next member" disabled={active === core.length - 1} onClick={() => goTo(active + 1)}><ChevronRight size={17} /></button></div></div>
  </div>;
}
