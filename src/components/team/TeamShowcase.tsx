'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, ArrowDown, ArrowUp, Menu, X, Plus } from 'lucide-react';
import nucleusLogo from '../../assets/NucleusLogo_transparent.png';
import SceneBoundary from './SceneBoundary';
import CoreOrbit from './CoreOrbit';
import MemberProfileOverlay from './MemberProfileOverlay';
import MemberGallery from './MemberGallery';
import AlumniSection from './AlumniSection';
import { currentTeam } from './alumni-data';
import { useSceneCapabilities } from './useSceneCapabilities';
import { isCurrentNavItem, navLinks } from '../../lib/nav';
import type { AlumniMember, ProfileSubject, TeamShowcaseProps } from './types';
import './team-showcase.css';

const GalaxyScene = dynamic(() => import('./GalaxyScene'), { ssr: false });
const noAlumni: AlumniMember[] = [];
const logoSource = typeof nucleusLogo === 'string' ? nucleusLogo : (nucleusLogo as { src: string }).src;
type Selection = { member: ProfileSubject; group: 'core' | 'community' | 'alumni' };

export default function TeamShowcase({ clubName, core: suppliedCore, members: suppliedMembers, alumni = noAlumni }: TeamShowcaseProps) {
  const capabilities = useSceneCapabilities();
  const pathname = usePathname() ?? '/';
  const { core, members } = useMemo(() => currentTeam(suppliedCore, suppliedMembers, alumni), [suppliedCore, suppliedMembers, alumni]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const constellationRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const orbitVisible = useInView(constellationRef, { margin: '100px' });
  const starfieldNearby = useInView(constellationRef, { margin: '200px', once: true });
  const { scrollYProgress } = useScroll({ target: constellationRef, offset: ['start start', 'end start'] });
  const cueOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  const openProfile = useCallback((member: ProfileSubject, group: Selection['group']) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected({ member, group });
  }, []);
  const closeProfile = useCallback(() => setSelected(null), []);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  const profileMembers = selected?.group === 'core' ? core : selected?.group === 'alumni' ? alumni : members;
  const profileIndex = selected ? profileMembers.findIndex(member => member.id === selected.member.id) : -1;

  return <div className="team-showcase" data-reduced-motion={capabilities.reducedMotion}>
    <a className="team-skip-link" href="#constellation">Skip to the constellation</a>
    <header className="team-header">
      <Link className="team-brand" href="/" aria-label={clubName + ' home'}><Image src="/brain-mark.svg" width={33} height={33} alt="" /><span>{clubName}<small>SJEC · MANGALURU</small></span></Link>
      <nav id="team-navigation" className={'team-nav ' + (menuOpen ? 'is-open' : '')} aria-label="Main navigation">{navLinks.map(({ label, href }) => <Link href={href} key={href} onClick={() => setMenuOpen(false)} aria-current={isCurrentNavItem(href, pathname) ? 'page' : undefined}>{label}</Link>)}</nav>
      <a className="team-header-link" href="#community">Find your orbit <ArrowUpRight size={15} /></a>
      <button className="team-menu-toggle team-icon-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="team-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </header>

    <main>
      <section ref={constellationRef} id="constellation" tabIndex={-1} className="constellation-section" aria-labelledby="galaxy-title">
        <div className="constellation-bg" aria-hidden="true">
          {capabilities.canAnimate && starfieldNearby && <SceneBoundary><GalaxyScene mobile={capabilities.mobile} lowPower={capabilities.lowPower} active={orbitVisible && !selected} /></SceneBoundary>}
        </div>
        <div className="galaxy-aura" aria-hidden="true" />
        <svg className="constellation-connections" viewBox="0 0 1200 800" fill="none" aria-hidden="true">
          <path d="M75 400L150 345L248 279L295 340M150 345L220 465M983 420L1040 320L1125 400M1040 320L985 240" />
          <g><circle cx="248" cy="279" r="3" /><circle cx="150" cy="345" r="2" /><circle cx="220" cy="465" r="2" /><circle cx="983" cy="420" r="3" /><circle cx="1040" cy="320" r="2" /><circle cx="985" cy="240" r="2" /></g>
        </svg>
        <div className="galaxy-grain" aria-hidden="true" />
        <p className="team-kicker constellation-kicker"><span className="team-signal" /> THE PEOPLE BEHIND THE POSSIBILITIES</p>

        <CoreOrbit core={core} selectedId={selected?.member.id ?? null} onSelect={member => openProfile(member, 'core')} active={orbitVisible} reducedMotion={capabilities.reducedMotion}>
          <div className="constellation-center">
            <div className="constellation-branding">
              {/* Reuse the shared Logo component's crop of the official asset. */}
              <svg className="constellation-logo" viewBox="430 128 672 625" role="img" aria-label="Official NUCLEUS club logo">
                <image href={logoSource} width="1599" height="899" />
              </svg>
              <h1 id="galaxy-title">{clubName}</h1>
              <p className="constellation-tagline">Different minds.<br /><span>One gravitational pull.</span></p>
            </div>
          </div>
        </CoreOrbit>

        <div className="constellation-bottom">
          <div className="galaxy-coordinate galaxy-coordinate-left" aria-hidden="true"><Plus size={13} /> 12.9141° N<br /><span>74.8560° E</span></div>
          <div className="galaxy-counts"><span><b>{String(core.length).padStart(2, '0')}</b> AT THE CORE</span><span><b>{String(members.length).padStart(2, '0')}</b> IN THE COMMUNITY</span></div>
          <motion.a className="galaxy-scroll" href="#community" style={capabilities.reducedMotion ? undefined : { opacity: cueOpacity }}>MEET THE COMMUNITY <span><ArrowDown size={15} /></span></motion.a>
          <div className="galaxy-coordinate galaxy-coordinate-right" aria-hidden="true">MANY MINDS.<br />ONE NUCLEUS.</div>
        </div>
      </section>

      <MemberGallery members={members} onSelect={member => openProfile(member, 'community')} reducedMotion={capabilities.reducedMotion} />
      <AlumniSection members={alumni} onSelect={member => openProfile(member, 'alumni')} reducedMotion={capabilities.reducedMotion} />
    </main>

    <footer className="team-footer"><Link className="team-brand" href="/"><Image src="/brain-mark.svg" width={28} height={28} alt="" /><span>{clubName}</span></Link><p>Made of many minds. © {new Date().getFullYear()} {clubName} SJEC.</p><a href="#galaxy-title">Back to the stars <ArrowUp size={14} /></a></footer>

    <AnimatePresence>{selected && <MemberProfileOverlay member={selected.member} index={profileIndex} total={profileMembers.length}
      group={selected.group === 'core' ? 'THE CORE' : selected.group === 'alumni' ? 'THE ALUMNI' : 'THE COMMUNITY'}
      clubName={clubName} reducedMotion={capabilities.reducedMotion} returnFocus={returnFocus.current} onClose={closeProfile}
      onNavigate={direction => {
        const next = (profileIndex + direction + profileMembers.length) % profileMembers.length;
        setSelected({ ...selected, member: profileMembers[next] });
      }} />}</AnimatePresence>
  </div>;
}
