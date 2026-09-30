'use client';

import { GraduationCap } from 'lucide-react';
import MemberCard from './MemberCard';
import type { AlumniMember } from './types';

export default function AlumniSection({ members, onSelect, reducedMotion, asPrimary = false }: {
  members: AlumniMember[]; onSelect: (member: AlumniMember) => void; reducedMotion: boolean; asPrimary?: boolean;
}) {
  return <section id="alumni" className="alumni-section team-section" aria-labelledby="alumni-heading" tabIndex={-1}>
    <div className="gallery-header">
      <div>
        <span className="team-kicker"><span className="team-section-index">01</span> OUR STORY CONTINUES</span>
        {asPrimary
          ? <h1 id="alumni-heading" tabIndex={-1}>NUCLEUS Alumni</h1>
          : <h2 id="alumni-heading">NUCLEUS Alumni</h2>}
        <p className="gallery-description">Celebrating the people who helped shape NUCLEUS, and the paths they have taken since.</p>
      </div>
    </div>
    {members.length ? <ul className="gallery-grid">
      {members.map((member, index) => <li key={member.id}><MemberCard member={member} index={index} onSelect={() => onSelect(member)} reducedMotion={reducedMotion} /></li>)}
    </ul> : <div className="alumni-empty"><GraduationCap size={28} strokeWidth={1} aria-hidden="true" /><p>Our alumni stories are coming soon.</p></div>}
  </section>;
}
