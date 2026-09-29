'use client';

import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { lazy, Suspense, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import SceneBoundary from './SceneBoundary';
import { useSceneCapabilities } from './useSceneCapabilities';
import { TeamLink as Link, TeamNavigationContext, useTeamNavigation, type TeamNavigation } from './TeamNavigation';

const GalaxyScene = lazy(() => import('./GalaxyScene'));

// Top navigation strictly retains the primary website pages.
// Members and Alumni are destination pages accessible via the navigation cards on /team.
const pageLinks: [string, string][] = [
  ['The idea', '/about'],
  ['Experiences', '/events'],
  ['Our work', '/projects'],
  ['The people', '/team'],
];

interface TeamShellProps {
  clubName: string;
  children: ReactNode;
  cta?: { href: string; label: string };
  skipTarget: string;
}

export default function TeamShell(props: TeamShellProps) {
  const navigation = useContext(TeamNavigationContext);
  return navigation ? <ShellContent {...props} /> : <NextShell {...props} />;
}

function NextShell(props: TeamShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navigation = useMemo<TeamNavigation>(() => ({ pathname, push: router.push, prefetch: router.prefetch, Link: NextLink }), [pathname, router]);
  return <TeamNavigationContext.Provider value={navigation}><ShellContent {...props} /></TeamNavigationContext.Provider>;
}

function ShellContent({ clubName, children, cta, skipTarget }: TeamShellProps) {
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
        Skip to {skipTarget === 'constellation' ? 'the constellation' : 'the content'}
      </a>
      <header className="team-header">
        <Link className="team-brand" href="/" aria-label={`${clubName} home`}>
          <img src="/brain-mark.svg" width={33} height={33} alt="" />
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
        </nav>
        {cta && (
          <Link className="team-header-link" href={cta.href}>
            {cta.label} <ArrowUpRight size={15} />
          </Link>
        )}
        <button
          className="team-menu-toggle team-icon-button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="team-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {children}
    </div>
  );
}
