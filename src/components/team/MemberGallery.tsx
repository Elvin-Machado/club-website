'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import type { ClubMember } from './types';
import MemberPhoto from './MemberPhoto';

interface MemberGalleryProps {
  members: ClubMember[];
  onSelect: (member: ClubMember) => void;
  onClose: () => void;
  reducedMotion: boolean;
}

export default function MemberGallery({ members, onSelect, onClose, reducedMotion }: MemberGalleryProps) {
  return <AnimatePresence>
    <motion.section className="member-gallery team-section" id="gallery" aria-labelledby="gallery-heading"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] }}>
      <div className="gallery-header">
        <div>
          <span className="team-kicker"><span className="team-signal" /> ALL MEMBERS</span>
          <h2 id="gallery-heading">Every mind matters.</h2>
        </div>
        <button className="team-icon-button gallery-close" onClick={onClose} aria-label="Close gallery"><X size={18} /></button>
      </div>
      <div className="gallery-grid">
        {members.map((member, i) => <motion.button key={member.id} className="gallery-card"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: reducedMotion ? 0 : Math.min(i * 0.04, 0.5) }}
          onClick={() => onSelect(member)} aria-label={`View ${member.name}, ${member.role}`}>
          <div className="gallery-card-portrait" aria-hidden="true"><MemberPhoto src={member.image} name={member.name} sizes="(max-width:500px) 40vw, 22vw" /></div>
          <div className="gallery-card-info"><h3>{member.name}</h3><p>{member.role}</p></div>
          <span className="gallery-card-arrow"><ArrowUpRight size={14} /></span>
        </motion.button>)}
      </div>
    </motion.section>
  </AnimatePresence>;
}
