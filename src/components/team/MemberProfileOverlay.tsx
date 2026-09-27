'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, X } from 'lucide-react';
import MemberPhoto from './MemberPhoto';
import type { CoreMember } from './types';

function socialLinks(socials: CoreMember['socials']) {
  if (!socials) return [];
  return Object.entries(socials).flatMap(([platform, value]) => {
    if (!value) return [];
    if (platform === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? [{ platform, href: `mailto:${value}` }] : [];
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? [{ platform, href: url.href }] : [];
    } catch { return []; }
  });
}

export default function MemberProfileOverlay({ member, index, total, clubName, onClose, reducedMotion, returnFocus }: {
  member: CoreMember; index: number; total: number; clubName: string; onClose: () => void; reducedMotion: boolean; returnFocus: HTMLElement | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      else document.getElementById('orbit-heading')?.focus({ preventScroll: true });
    };
  }, [returnFocus]);
  return createPortal(<motion.dialog ref={dialog} className="team-profile" aria-labelledby="profile-name" aria-describedby={member.bio ? 'profile-bio' : undefined}
    onCancel={event => { event.preventDefault(); onClose(); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0.15 : 0.45 }}>
    <motion.div className="profile-surface" initial={{ scale: reducedMotion ? 1 : 1.04 }} animate={{ scale: 1 }} exit={{ scale: reducedMotion ? 1 : 0.98 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
      <div className="profile-portrait"><MemberPhoto key={member.image} src={member.image} name={member.name} sizes="(max-width: 767px) 100vw, 65vw" priority /><div className="profile-photo-shade" /></div>
      <div className="profile-topline"><span className="team-kicker">{clubName.toUpperCase()} / THE CORE</span><button className="profile-close" onClick={onClose} autoFocus aria-label="Close profile">CLOSE <X size={20} /></button></div>
      <div className="profile-copy"><span className="team-kicker profile-index">ORBIT {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span><p className="profile-role"><span className="team-signal" />{member.role}</p><h2 id="profile-name">{member.name}</h2>{member.bio && <p id="profile-bio" className="profile-bio">{member.bio}</p>}
        {socialLinks(member.socials).length > 0 && <nav className="profile-socials" aria-label={`${member.name}'s social links`}>{socialLinks(member.socials).map(({ platform, href }) => <a key={platform} href={href} target={platform === 'email' ? undefined : '_blank'} rel="noopener noreferrer">{platform === 'twitter' ? 'X / Twitter' : platform}<ArrowUpRight size={15} /></a>)}</nav>}
        <button className="profile-back" onClick={onClose}><ArrowLeft size={17} /> Back to the constellation</button>
      </div>
      <span className="profile-signoff team-kicker">ONE OF MANY MINDS. ONE OF A KIND.</span>
    </motion.div>
  </motion.dialog>, document.body);
}
