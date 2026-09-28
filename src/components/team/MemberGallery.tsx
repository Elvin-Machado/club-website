'use client';

import { ArrowDown } from 'lucide-react';
import type { ClubMember } from './types';
import MemberCard from './MemberCard';

interface MemberGalleryProps {
  members: ClubMember[];
  onSelect: (member: ClubMember) => void;
  reducedMotion: boolean;
}

export default function MemberGallery({ members, onSelect, reducedMotion }: MemberGalleryProps) {
  return <section className="member-gallery team-section" id="community" aria-labelledby="gallery-heading">
      <div className="gallery-header">
        <div>
          <span className="team-kicker"><span className="team-section-index">01</span> THE COMMUNITY</span>
          <h2 id="gallery-heading">Every mind matters.</h2>
          <p className="gallery-description">Meet the NUCLEUS community.</p>
        </div>
        <a className="team-text-link" href="#alumni">NUCLEUS Alumni <ArrowDown size={15} /></a>
      </div>
      <div className="gallery-grid">
        {members.map((member, index) => <MemberCard key={member.id} member={member} index={index} onSelect={() => onSelect(member)} reducedMotion={reducedMotion} />)}
      </div>
      {!members.length && <p className="gallery-empty">Our next connections are on their way.</p>}
    </section>;
}
