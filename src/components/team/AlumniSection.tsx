'use client';

import { GraduationCap } from 'lucide-react';
import MemberCard from './MemberCard';
import type { AlumniMember } from './types';

export default function AlumniSection({ members, onSelect, reducedMotion }: {
  members: AlumniMember[]; onSelect: (member: AlumniMember) => void; reducedMotion: boolean;
}) {
  return <section id="alumni" className="alumni-section team-section" aria-labelledby="alumni-heading">
    <div className="gallery-header">
      <div>
        <span className="team-kicker"><span className="team-section-index">02</span> OUR STORY CONTINUES</span>
        <h2 id="alumni-heading">NUCLEUS Alumni</h2>
        <p className="gallery-description">Once part of NUCLEUS, always part of the universe.</p>
      </div>
    </div>
    {members.length ? <div className="gallery-grid">
      {members.map((member, index) => <MemberCard key={member.id} member={member} index={index} onSelect={() => onSelect(member)} reducedMotion={reducedMotion} />)}
    </div> : <div className="alumni-empty"><GraduationCap size={28} strokeWidth={1} aria-hidden="true" /><p>Our alumni stories are coming soon.</p></div>}
  </section>;
}
