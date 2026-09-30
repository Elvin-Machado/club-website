'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import MemberPhoto from './MemberPhoto';
import type { ProfileSubject } from './types';

// The retained small gallery card is shared by current members and alumni.
export default function MemberCard({ member, index, onSelect, reducedMotion }: {
  member: ProfileSubject; index: number; onSelect: () => void; reducedMotion: boolean;
}) {
  const domain = 'domain' in member && member.domain
    ? member.domain
    : 'department' in member && member.department ? member.department : 'team' in member ? member.team : undefined;
  const career = 'jobTitle' in member || 'organization' in member
    ? ['jobTitle' in member ? member.jobTitle : '', 'organization' in member ? member.organization : ''].filter(Boolean).join(' · ') : undefined;

  return <motion.button type="button" className="gallery-card" data-member-id={member.id}
    initial={reducedMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : Math.min(index * 0.04, 0.24) }}
    onClick={onSelect} aria-label={`View ${member.name}, ${member.role}`} aria-haspopup="dialog">
    <span className="gallery-card-portrait" aria-hidden="true"><MemberPhoto src={member.image} name={member.name} sizes="(max-width: 500px) 80vw, (max-width: 767px) 40vw, 240px" /></span>
    <span className="gallery-card-info">
      <span className="gallery-card-name">{member.name}</span>
      <span className="gallery-card-role">{member.role}</span>
      {domain && <span className="gallery-card-detail">{domain}</span>}
      {'graduationYear' in member && member.graduationYear && <span className="gallery-card-detail">Class of {member.graduationYear}</span>}
      {career && <span className="gallery-card-detail">{career}</span>}
      {'higherStudies' in member && member.higherStudies && <span className="gallery-card-detail">{member.higherStudies}</span>}
      {member.bio && <span className="gallery-card-bio">{member.bio}</span>}
    </span>
    <span className="gallery-card-arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
  </motion.button>;
}
