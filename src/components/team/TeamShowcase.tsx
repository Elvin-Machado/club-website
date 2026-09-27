'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { ArrowUpRight, ArrowUp, Menu, X } from 'lucide-react';
import GalaxyHero from './GalaxyHero';
import CoreCarousel from './CoreCarousel';
import MemberProfileOverlay from './MemberProfileOverlay';
import RosterSection from './RosterSection';
import { useSceneCapabilities } from './useSceneCapabilities';
import type { CoreMember, TeamShowcaseProps } from './types';
import './team-showcase.css';

const CoreOrbit = dynamic(() => import('./CoreOrbit'), { ssr: false, loading: () => <div className="orbit-loading"><span className="orbit-loading-ring" /><span className="team-kicker">MAPPING THE CONSTELLATION</span></div> });

export default function TeamShowcase({ clubName, core, members }: TeamShowcaseProps) {
  const capabilities = useSceneCapabilities();
  const [selected, setSelected] = useState<CoreMember | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const coreSection = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const orbitNearby = useInView(coreSection, { margin: '400px', once: true });
  const orbitVisible = useInView(coreSection, { margin: '100px' });
  const useOrbit = capabilities.canAnimate && !capabilities.mobile && !capabilities.lowPower;
  const showProfile = useCallback(() => setProfileVisible(true), []);
  const selectMember = useCallback((member: CoreMember) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(member);
    if (!useOrbit) setProfileVisible(true);
  }, [useOrbit]);
  useEffect(() => {
    if (!selected) return;
    // Covers a viewport change, suspended tab, or a lost graphics context mid-dolly.
    const timeout = window.setTimeout(() => setProfileVisible(true), useOrbit ? 1100 : 0);
    return () => window.clearTimeout(timeout);
  }, [selected, useOrbit]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  if (core.length !== 8) throw new Error('TeamShowcase requires exactly 8 core members.');

  return <div className="team-showcase" data-reduced-motion={capabilities.reducedMotion}>
    <a className="team-skip-link" href="#core-team">Skip to the team</a>
    <header className="team-header">
      <Link className="team-brand" href="/" aria-label={`${clubName} home`}><Image src="/brain-mark.svg" width={33} height={33} alt="" /><span>{clubName}<small>SJEC · MANGALURU</small></span></Link>
      <nav id="team-navigation" className={`team-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">{[['The idea', '/about'], ['Experiences', '/events'], ['Our work', '/projects'], ['The people', '/team']].map(([label, href]) => <Link href={href} key={href} onClick={() => setMenuOpen(false)} aria-current={href === '/team' ? 'page' : undefined}>{label}</Link>)}</nav>
      <a className="team-header-link" href="#join">Find your orbit <ArrowUpRight size={15} /></a>
      <button className="team-menu-toggle team-icon-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="team-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </header>
    <main>
      <GalaxyHero clubName={clubName} coreCount={core.length} memberCount={members.length} animate={capabilities.canAnimate} mobile={capabilities.mobile} lowPower={capabilities.lowPower} reducedMotion={capabilities.reducedMotion} />
      <section id="core-team" ref={coreSection} className="core-section team-section" aria-labelledby="orbit-heading">
        <div className="team-section-top"><span className="team-kicker"><span className="team-section-index">01</span> THE ORBIT</span><span className="team-kicker text-zinc-500">{String(core.length).padStart(2, '0')} MINDS AT THE CENTRE</span></div>
        <motion.div className="team-section-heading" initial={capabilities.reducedMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.65 }}><h2 id="orbit-heading" tabIndex={-1}>A shared centre.<br /><span>Eight distinct worlds.</span></h2><p>The ones connecting the dots.<br />Meet the core that keeps us moving.</p></motion.div>
        {useOrbit ? orbitNearby && <CoreOrbit core={core} selectedId={selected?.id ?? null} onSelect={selectMember} onFocused={showProfile} active={orbitVisible} /> : <CoreCarousel core={core} onSelect={selectMember} reducedMotion={capabilities.reducedMotion} />}
        <div className="orbit-caption"><span className="team-signal" /><p>Individual perspectives. Collective momentum.</p><a href="#members">Meet the whole constellation <ArrowUpRight size={15} /></a></div>
      </section>
      <RosterSection members={members} reducedMotion={capabilities.reducedMotion} />
      <section className="team-invitation-section team-section" id="join" aria-labelledby="join-heading"><span className="team-kicker"><span className="team-signal" /> THERE’S ROOM IN OUR UNIVERSE</span><h2 id="join-heading">Your kind of people.<br /><span>Your next chapter.</span></h2><a className="team-join-link" href="mailto:nucleussjec@gmail.com">Start a conversation <ArrowUpRight size={22} /></a><span className="invitation-star" aria-hidden="true">✳</span></section>
    </main>
    <footer className="team-footer"><Link className="team-brand" href="/"><Image src="/brain-mark.svg" width={28} height={28} alt="" /><span>{clubName}</span></Link><p>Made of many minds. © {new Date().getFullYear()} {clubName} SJEC.</p><a href="#galaxy-title">Back to the stars <ArrowUp size={14} /></a></footer>
    <AnimatePresence>{selected && profileVisible && <MemberProfileOverlay key={selected.id} member={selected} index={core.findIndex(member => member.id === selected.id)} total={core.length} clubName={clubName} reducedMotion={capabilities.reducedMotion} returnFocus={returnFocus.current} onClose={() => { setSelected(null); setProfileVisible(false); }} />}</AnimatePresence>
  </div>;
}
