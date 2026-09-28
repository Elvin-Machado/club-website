'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, ArrowDown, ArrowUp, Menu, X, Plus } from 'lucide-react';
import SceneBoundary from './SceneBoundary';
import CoreCarousel from './CoreCarousel';
import MemberProfileOverlay from './MemberProfileOverlay';
import MemberDeck from './MemberDeck';
import MemberGallery from './MemberGallery';
import RosterSection from './RosterSection';
import { useSceneCapabilities } from './useSceneCapabilities';
import type { CoreMember, ClubMember, TeamShowcaseProps } from './types';
import './team-showcase.css';

const GalaxyScene = dynamic(() => import('./GalaxyScene'), { ssr: false });
const CoreOrbit = dynamic(() => import('./CoreOrbit'), { ssr: false, loading: () => <div className="orbit-loading"><span className="orbit-loading-ring" /><span className="team-kicker">MAPPING THE CONSTELLATION</span></div> });

export default function TeamShowcase({ clubName, core, members }: TeamShowcaseProps) {
  const capabilities = useSceneCapabilities();
  const [selected, setSelected] = useState<CoreMember | null>(null);
  const [selectedMember, setSelectedMember] = useState<ClubMember | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const constellationRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const orbitNearby = useInView(constellationRef, { margin: '400px', once: true });
  const orbitVisible = useInView(constellationRef, { margin: '100px' });
  const starfieldVisible = useInView(constellationRef, { margin: '200px' });
  const useOrbit = capabilities.canAnimate && !capabilities.mobile && !capabilities.lowPower;

  // Scroll-linked transforms for the constellation title
  const { scrollYProgress } = useScroll({ target: constellationRef, offset: ['start start', 'end start'] });
  const titleScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.92]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  const showProfile = useCallback(() => setProfileVisible(true), []);
  const selectMember = useCallback((member: CoreMember) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedMember(null);
    setSelected(member);
    if (!useOrbit) setProfileVisible(true);
  }, [useOrbit]);

  const openMemberProfile = useCallback((member: ClubMember) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(null);
    setSelectedMember(member);
    setProfileVisible(true);
  }, []);

  const closeProfile = useCallback(() => {
    setSelected(null);
    setSelectedMember(null);
    setProfileVisible(false);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const timeout = window.setTimeout(() => setProfileVisible(true), useOrbit ? 1100 : 0);
    return () => window.clearTimeout(timeout);
  }, [selected, useOrbit]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  if (core.length < 2 || core.length > 16) throw new Error('TeamShowcase requires 2–16 core members.');

  return <div className="team-showcase" data-reduced-motion={capabilities.reducedMotion}>
    <a className="team-skip-link" href="#constellation">Skip to the constellation</a>
    <header className="team-header">
      <Link className="team-brand" href="/" aria-label={`${clubName} home`}><Image src="/brain-mark.svg" width={33} height={33} alt="" /><span>{clubName}<small>SJEC · MANGALURU</small></span></Link>
      <nav id="team-navigation" className={`team-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">{[['The idea', '/about'], ['Experiences', '/events'], ['Our work', '/projects'], ['The people', '/team']].map(([label, href]) => <Link href={href} key={href} onClick={() => setMenuOpen(false)} aria-current={href === '/team' ? 'page' : undefined}>{label}</Link>)}</nav>
      <a className="team-header-link" href="#community">Find your orbit <ArrowUpRight size={15} /></a>
      <button className="team-menu-toggle team-icon-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="team-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </header>

    <main>
      {/* ================================================================== */}
      {/* UNIFIED CONSTELLATION — hero + orbit merged into one composition    */}
      {/* ================================================================== */}
      <section ref={constellationRef} id="constellation" className="constellation-section" aria-labelledby="galaxy-title">
        {/* Background layers */}
        <div className="constellation-bg" aria-hidden="true">
          {capabilities.canAnimate && starfieldVisible && <SceneBoundary><GalaxyScene mobile={capabilities.mobile} lowPower={capabilities.lowPower} /></SceneBoundary>}
        </div>
        <div className="galaxy-aura" aria-hidden="true" />
        <svg className="galaxy-orbital-lines" viewBox="0 0 1200 800" fill="none" aria-hidden="true">
          <ellipse cx="600" cy="400" rx="445" ry="239" transform="rotate(-24 600 400)" />
          <ellipse cx="600" cy="400" rx="475" ry="262" transform="rotate(-24 600 400)" strokeDasharray="2 10" />
          <ellipse cx="600" cy="400" rx="350" ry="345" transform="rotate(30 600 400)" className="galaxy-inner-orbit" />
          <path d="M75 400H1125M600 45V755" className="galaxy-crosshair" />
          <circle cx="248" cy="279" r="4" className="galaxy-beacon" />
          <circle cx="983" cy="420" r="3" className="galaxy-beacon" />
          <circle cx="742" cy="616" r="2.5" className="galaxy-beacon" />
        </svg>
        <div className="galaxy-grain" aria-hidden="true" />

        {/* Central NUCLEUS title — scrolls and fades as user moves into the orbit */}
        <motion.div className="constellation-center" style={{ y: parallaxY }}>
          <motion.p className="team-kicker constellation-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}><span className="team-signal" /> THE PEOPLE BEHIND THE POSSIBILITIES</motion.p>
          <motion.h1 id="galaxy-title" style={{ scale: titleScale, opacity: titleOpacity }} initial={capabilities.reducedMotion ? { opacity: 0 } : { opacity: 0, letterSpacing: '0.13em', filter: 'blur(8px)' }} animate={{ opacity: 1, letterSpacing: '-0.065em', filter: 'blur(0px)' }} transition={{ duration: capabilities.reducedMotion ? 0.4 : 1.8, ease: [0.22, 1, 0.36, 1] }}>{clubName}<span className="galaxy-title-star" aria-hidden="true">✳</span></motion.h1>
          <motion.p className="constellation-tagline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: capabilities.reducedMotion ? 0 : 0.55, duration: 1 }}>Different minds. <span className="text-zinc-400">One gravitational pull.</span></motion.p>
        </motion.div>

        {/* 3D orbit — overlaid with transparent canvas, nodes orbit the centre */}
        <div className="constellation-orbit">
          {useOrbit ? orbitNearby && <CoreOrbit core={core} selectedId={selected?.id ?? null} onSelect={selectMember} onFocused={showProfile} active={orbitVisible} /> : <CoreCarousel core={core} onSelect={selectMember} reducedMotion={capabilities.reducedMotion} />}
        </div>

        {/* Bottom strip: counts, coordinates, scroll cue */}
        <div className="constellation-bottom">
          <div className="galaxy-coordinate galaxy-coordinate-left" aria-hidden="true"><Plus size={13} /> 12.9141° N<br /><span>74.8560° E</span></div>
          <div className="galaxy-counts"><span><b>{String(core.length).padStart(2, '0')}</b> AT THE CORE</span><span><b>{String(members.length).padStart(2, '0')}</b> IN THE CONSTELLATION</span></div>
          <motion.a className="galaxy-scroll" href="#community" style={{ opacity: cueOpacity }}>SCROLL TO DISCOVER <span><ArrowDown size={15} /></span></motion.a>
          <div className="galaxy-coordinate galaxy-coordinate-right" aria-hidden="true">MANY MINDS.<br />ONE NUCLEUS.</div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* NON-CORE MEMBERS — slide deck                                      */}
      {/* ================================================================== */}
      <MemberDeck members={members} onSelect={openMemberProfile} onShowAll={() => { setGalleryOpen(true); requestAnimationFrame(() => document.getElementById('gallery')?.scrollIntoView({ behavior: capabilities.reducedMotion ? 'auto' : 'smooth', block: 'start' })); }} reducedMotion={capabilities.reducedMotion} />
      {galleryOpen && <MemberGallery members={members} onSelect={openMemberProfile} onClose={() => { setGalleryOpen(false); requestAnimationFrame(() => document.getElementById('community')?.scrollIntoView({ behavior: capabilities.reducedMotion ? 'auto' : 'smooth', block: 'start' })); }} reducedMotion={capabilities.reducedMotion} />}

      {/* ================================================================== */}
      {/* SEARCHABLE ROSTER (full member list)                                */}
      {/* ================================================================== */}
      <RosterSection members={members} onSelect={openMemberProfile} reducedMotion={capabilities.reducedMotion} />

      {/* Join / CTA */}
      <section className="team-invitation-section team-section" id="join" aria-labelledby="join-heading"><span className="team-kicker"><span className="team-signal" /> THERE'S ROOM IN OUR UNIVERSE</span><h2 id="join-heading">Your kind of people.<br /><span>Your next chapter.</span></h2><a className="team-join-link" href="mailto:nucleussjec@gmail.com">Start a conversation <ArrowUpRight size={22} /></a><span className="invitation-star" aria-hidden="true">✳</span></section>
    </main>

    <footer className="team-footer"><Link className="team-brand" href="/"><Image src="/brain-mark.svg" width={28} height={28} alt="" /><span>{clubName}</span></Link><p>Made of many minds. © {new Date().getFullYear()} {clubName} SJEC.</p><a href="#galaxy-title">Back to the stars <ArrowUp size={14} /></a></footer>

    <AnimatePresence>{(selected || selectedMember) && profileVisible && <MemberProfileOverlay key={selected?.id ?? selectedMember!.id} member={(selected ?? selectedMember)!} index={selected ? core.findIndex(member => member.id === selected.id) : members.findIndex(member => member.id === selectedMember!.id)} total={selected ? core.length : members.length} group={selected ? 'THE CORE' : 'THE COMMUNITY'} clubName={clubName} reducedMotion={capabilities.reducedMotion} returnFocus={returnFocus.current} onClose={closeProfile} />}</AnimatePresence>
  </div>;
}
