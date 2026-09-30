'use client';

import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import SceneBoundary from './SceneBoundary';
import { useSceneCapabilities } from './useSceneCapabilities';
import { TeamLink as Link, useTeamNavigation } from './TeamNavigation';

const GalaxyScene = lazy(() => import('./GalaxyScene'));

// Top navigation strictly retains the primary website pages.
// Members and Alumni are destination pages accessible via the navigation cards on /team.
const pageLinks: [string, string][] = [
  ['Home', '/'],
  ['The idea', '/about'],
  ['Experiences', '/events'],
  ['Our work', '/projects'],
  ['The people', '/team'],
  ['Contact', '/#contact'],
];

interface TeamShellProps {
  clubName: string;
  children: ReactNode;
  cta?: { href: string; label: string };
  skipTarget: string;
}

export default function TeamShell({ clubName, children, cta, skipTarget }: TeamShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [starsReady, setStarsReady] = useState(false);
  const { pathname } = useTeamNavigation();
  const capabilities = useSceneCapabilities();

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  return (
    <div className="team-showcase">
      {/* Outside all animated sections: one atmosphere for the full page. */}
      <div className="constellation-bg" aria-hidden="true" data-animated={capabilities.canAnimate && starsReady ? 'true' : undefined}>
        <div className="galaxy-aura" />
        {capabilities.canAnimate && <SceneBoundary><Suspense fallback={null}>
          <GalaxyScene mobile={capabilities.mobile} lowPower={capabilities.lowPower} onReady={setStarsReady} />
        </Suspense></SceneBoundary>}
        <div className="galaxy-grain" />
      </div>
      <a className="team-skip-link" href={`#${skipTarget}`}>
        Skip to {skipTarget === 'core-team-deck' || skipTarget === 'constellation' ? 'the core team deck' : 'the content'}
      </a>
      <header className="team-header">
        <Link className="team-brand" href="/" aria-label={`${clubName} SJEC · MANGALURU home`}>
          <img src="/brain-mark.svg" width={33} height={33} alt="" aria-hidden="true" />
          <span>
            {clubName}
            <small>SJEC · MANGALURU</small>
          </span>
        </Link>
        <nav id="team-navigation" className={`team-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {pageLinks.map(([label, href]) => (
            <Link
              href={href}
              key={href}
              onClick={() => setMenuOpen(false)}
              aria-current={pathname === href ? 'page' : undefined}
              data-active={href === '/team' && ['/team', '/members', '/alumni'].includes(pathname) ? 'true' : undefined}
            >
              {label}
            </Link>
          ))}
          {cta && <Link className="team-mobile-cta" href={cta.href} onClick={() => setMenuOpen(false)}>{cta.label}<ArrowUpRight size={15} aria-hidden="true" /></Link>}
        </nav>
        {cta && (
          <Link className="team-header-link" href={cta.href}>
            {cta.label} <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        )}
        <button
          className="team-menu-toggle team-icon-button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="team-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </header>
      {children}
    </div>
  );
}
