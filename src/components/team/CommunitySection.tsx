'use client';

import MemberCard from './MemberCard';
import type { ClubMember } from './types';

// One directory owns the existing non-core records and their profile cards.
export default function CommunitySection({ members, onSelect, reducedMotion }: { members: ClubMember[]; onSelect: (member: ClubMember) => void; reducedMotion: boolean }) {
  return <section className="community-section team-section" id="community" aria-labelledby="community-heading" tabIndex={-1}>
    <div className="gallery-header">
      <div>
        <span className="team-kicker">THE COMMUNITY</span>
        <h1 id="community-heading" tabIndex={-1}>Our Members</h1>
        <p className="gallery-description">Different skills, shared curiosity. Meet the current members who bring the NUCLEUS community to life.</p>
      </div>
      <span className="team-kicker">{String(members.length).padStart(2, '0')} MEMBERS</span>
    </div>
    {members.length ? <ul className="gallery-grid">
      {members.map((member, index) => <li key={member.id}><MemberCard member={member} index={index} onSelect={() => onSelect(member)} reducedMotion={reducedMotion} /></li>)}
    </ul> : <div className="alumni-empty"><p>Our member directory will be updated soon.</p></div>}
  </section>;
}
