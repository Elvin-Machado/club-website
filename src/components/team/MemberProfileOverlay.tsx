'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, X } from 'lucide-react';
import MemberPhoto from './MemberPhoto';
import type { ProfileSubject } from './types';

const platformLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  leetcode: 'LeetCode',
  gfg: 'GeeksforGeeks',
  kaggle: 'Kaggle',
  codeforces: 'Codeforces',
  twitter: 'X / Twitter',
  instagram: 'Instagram',
  email: 'Email',
};

function socialLinks(socials: ProfileSubject['socials']) {
  if (!socials) return [];
  return Object.entries(socials).flatMap(([platform, value]) => {
    if (!value || value === '#') return [];
    const label = platformLabels[platform.toLowerCase()] || platform;
    if (platform.toLowerCase() === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? [{ platform, label, href: `mailto:${value}` }] : [];
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return [{ platform, label, href: url.href }];
      }
      return [];
    } catch { return []; }
  });
}

export default function MemberProfileOverlay({ member, index, total, clubName, onClose, reducedMotion, returnFocus, group = 'THE CORE' }: {
  member: ProfileSubject; index: number; total: number; clubName: string; onClose: () => void; reducedMotion: boolean; returnFocus: HTMLElement | null; group?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const domain = 'domain' in member && member.domain ? member.domain : 'department' in member && member.department ? member.department : 'team' in member ? member.team : undefined;
  const career = ['jobTitle' in member ? member.jobTitle : undefined, 'organization' in member ? member.organization : undefined].filter(Boolean).join(' · ');
  const details = [
    ['Community', domain],
    ['Graduating class', 'graduationYear' in member ? member.graduationYear : undefined],
    ['Now', career],
    ['Higher studies', 'higherStudies' in member ? member.higherStudies : undefined],
    ['Skills', 'skills' in member ? member.skills?.join(', ') : undefined],
  ].filter(([, value]) => Boolean(value));
  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      else document.getElementById(group === 'THE CORE' ? 'core-team-deck' : group === 'ALUMNI' ? 'alumni-heading' : 'community-heading')?.focus({ preventScroll: true });
    };
  }, [returnFocus, group]);
  return createPortal(<motion.dialog ref={dialog} className="team-profile" aria-labelledby="profile-name" aria-describedby={member.bio ? 'profile-bio' : undefined}
    onCancel={event => { event.preventDefault(); onClose(); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.3 }}>
    <motion.div className="profile-surface" initial={{ scale: reducedMotion ? 1 : 1.04 }} animate={{ scale: 1 }} exit={{ scale: reducedMotion ? 1 : 0.98 }} transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <div className="profile-portrait"><MemberPhoto key={member.image} src={member.image} name={member.name} sizes="(max-width: 767px) 100vw, 65vw" priority /><div className="profile-photo-shade" /></div>
      <div className="profile-topline"><span className="team-kicker">{clubName.toUpperCase()} / {group}</span><button className="profile-close" onClick={onClose} autoFocus aria-label="Close profile">CLOSE <X size={20} /></button></div>
      <div className="profile-copy"><span className="team-kicker profile-index">ORBIT {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span><p className="profile-role"><span className="team-signal" />{member.role}</p><h2 id="profile-name">{member.name}</h2>{member.bio && <p id="profile-bio" className="profile-bio">{member.bio}</p>}
        {socialLinks(member.socials).length > 0 && <nav className="profile-socials" aria-label={`${member.name}'s social links`}>{socialLinks(member.socials).map(({ platform, label, href }) => <a key={platform} href={href} target={platform === 'email' ? undefined : '_blank'} rel="noopener noreferrer">{label}<ArrowUpRight size={15} /></a>)}</nav>}
        {details.length > 0 && <dl className="profile-details">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        <button className="profile-back" onClick={onClose}><ArrowLeft size={17} /> {group === 'THE CORE' ? 'Back to core team' : group === 'ALUMNI' ? 'Back to alumni' : 'Back to members'}</button>
      </div>
      <span className="profile-signoff team-kicker">ONE OF MANY MINDS. ONE OF A KIND.</span>
    </motion.div>
  </motion.dialog>, document.body);
}
