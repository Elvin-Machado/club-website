'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Plus } from 'lucide-react';
import SceneBoundary from './SceneBoundary';

const GalaxyScene = dynamic(() => import('./GalaxyScene'), { ssr: false });

interface GalaxyHeroProps {
  clubName: string;
  coreCount: number;
  memberCount: number;
  animate: boolean;
  mobile: boolean;
  lowPower: boolean;
  reducedMotion: boolean;
}

export default function GalaxyHero({ clubName, coreCount, memberCount, animate, mobile, lowPower, reducedMotion }: GalaxyHeroProps) {
  const ref = useRef<HTMLElement>(null);
  const visible = useInView(ref, { margin: '100px' });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const cueOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);
  return <section ref={ref} className="galaxy-hero" aria-labelledby="galaxy-title">
    <div className="galaxy-backdrop" aria-hidden="true">
      {animate && visible && <SceneBoundary><GalaxyScene mobile={mobile} lowPower={lowPower} /></SceneBoundary>}
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
    <div className="galaxy-letterbox galaxy-letterbox-top" aria-hidden="true" />
    <div className="galaxy-letterbox galaxy-letterbox-bottom" aria-hidden="true" />
    <div className="galaxy-coordinate galaxy-coordinate-left" aria-hidden="true"><Plus size={13} /> 12.9141° N<br /><span>74.8560° E</span></div>
    <div className="galaxy-coordinate galaxy-coordinate-right" aria-hidden="true">MANY MINDS.<br />ONE NUCLEUS.</div>
    <div className="galaxy-copy">
      <motion.p className="team-kicker galaxy-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}><span className="team-signal" /> THE PEOPLE BEHIND THE POSSIBILITIES</motion.p>
      <motion.h1 id="galaxy-title" initial={reducedMotion ? { opacity: 0 } : { opacity: 0, letterSpacing: '0.13em', filter: 'blur(8px)' }} animate={{ opacity: 1, letterSpacing: '-0.065em', filter: 'blur(0px)' }} transition={{ duration: reducedMotion ? 0.4 : 1.8, ease: [0.22, 1, 0.36, 1] }}>{clubName}<span className="galaxy-title-star" aria-hidden="true">✳</span></motion.h1>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reducedMotion ? 0 : 0.55, duration: 1 }}>
        <p className="galaxy-tagline">Different minds. <span>One gravitational pull.</span></p>
        <p className="galaxy-description">Builders, dreamers, and the beautifully curious.<br />Meet the people who make our universe expand.</p>
        <a className="galaxy-explore" href="#core-team">Explore our constellation <ArrowUpRight size={16} /></a>
      </motion.div>
    </div>
    <div className="galaxy-bottom">
      <div className="galaxy-counts"><span><b>{String(coreCount).padStart(2, '0')}</b> AT THE CORE</span><span><b>{String(memberCount).padStart(2, '0')}</b> IN THE CONSTELLATION</span></div>
      <motion.a className="galaxy-scroll" href="#core-team" style={{ opacity: cueOpacity }}>SCROLL TO DISCOVER <span><ArrowDown size={15} /></span></motion.a>
      <span className="galaxy-chapter">CHAPTER 01 <i /> THE COLLECTIVE</span>
    </div>
  </section>;
}
