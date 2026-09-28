'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import MemberPhoto from './MemberPhoto';
import type { ProfileSubject } from './types';

function socialLinks(socials: ProfileSubject['socials']) {
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

export default function MemberProfileOverlay({ member, index, total, clubName, onClose, onNavigate, reducedMotion, returnFocus, group = 'THE CORE' }: {
  member: ProfileSubject; index: number; total: number; clubName: string; onClose: () => void; onNavigate?: (direction: number) => void; reducedMotion: boolean; returnFocus: HTMLElement | null; group?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const links = socialLinks(member.socials);
  const details = [
    ['Domain', member.domain],
    ['Department', member.department],
    ['Team', 'team' in member ? member.team : undefined],
    ['Graduation', 'graduationYear' in member ? member.graduationYear : undefined],
    ['Organization', 'organization' in member ? member.organization : undefined],
    ['Current role', 'jobTitle' in member ? member.jobTitle : undefined],
    ['Higher studies', 'higherStudies' in member ? member.higherStudies : undefined],
  ].filter(([, value]) => Boolean(value));
  const backLabel = group === 'THE CORE' ? 'Back to the constellation' : group === 'THE ALUMNI' ? 'Back to alumni' : 'Back to the community';
  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      else document.getElementById('constellation')?.focus({ preventScroll: true });
    };
  }, [returnFocus]);
  useEffect(() => { dialog.current?.scrollTo({ top: 0, behavior: 'instant' }); }, [member.id]);
  return createPortal(<motion.dialog ref={dialog} className="team-profile" aria-labelledby="profile-name" aria-describedby={member.bio ? 'profile-bio' : undefined}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const stops = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')].filter(element => element.getClientRects().length > 0);
      const destination = event.shiftKey && document.activeElement === stops[0] ? stops.at(-1)
        : !event.shiftKey && document.activeElement === stops.at(-1) ? stops[0] : undefined;
      if (destination) { event.preventDefault(); destination.focus(); }
    }}
    onCancel={event => { event.preventDefault(); onClose(); }} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.45 }}>
    <motion.div className="profile-surface" initial={reducedMotion ? false : { scale: 1.04 }} animate={{ scale: 1 }} exit={{ scale: reducedMotion ? 1 : 0.98 }} transition={{ duration: reducedMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}>
      <div className="profile-portrait" aria-hidden="true"><MemberPhoto key={member.id} src={member.image} name={member.name} sizes="(max-width: 767px) 100vw, 65vw" priority /><div className="profile-photo-shade" /></div>
      <div className="profile-topline"><span className="team-kicker">{clubName.toUpperCase()} / {group}</span><button className="profile-close" onClick={onClose} autoFocus aria-label="Close profile">CLOSE <X size={20} /></button></div>
      <div className="profile-copy"><span className="team-kicker profile-index">PROFILE {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span><p className="profile-role"><span className="team-signal" />{group === 'THE ALUMNI' ? 'Former ' : ''}{member.role}</p><h2 id="profile-name" aria-live="polite" aria-atomic="true">{member.name}</h2>{member.bio && <p id="profile-bio" className="profile-bio">{member.bio}</p>}
        {details.length > 0 && <dl className="profile-details">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        {!!member.skills?.length && <ul className="profile-skills" aria-label="Skills and interests">{member.skills.map(skill => <li key={skill}>{skill}</li>)}</ul>}
        {links.length > 0 && <nav className="profile-socials" aria-label={`${member.name}'s social links`}>{links.map(({ platform, href }) => <a key={platform} href={href} target={platform === 'email' ? undefined : '_blank'} rel="noopener noreferrer">{platform === 'twitter' ? 'X / Twitter' : platform}<ArrowUpRight size={15} /></a>)}</nav>}
        {onNavigate && total > 1 && <nav className="profile-navigation" aria-label="Browse profiles"><button type="button" className="team-icon-button" onClick={() => onNavigate(-1)} aria-label="Previous profile"><ChevronLeft size={18} /></button><span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span><button type="button" className="team-icon-button" onClick={() => onNavigate(1)} aria-label="Next profile"><ChevronRight size={18} /></button></nav>}
        <button className="profile-back" onClick={onClose}><ArrowLeft size={17} /> {backLabel}</button>
      </div>
      <span className="profile-signoff team-kicker">ONE OF MANY MINDS. ONE OF A KIND.</span>
    </motion.div>
  </motion.dialog>, document.body);
}
