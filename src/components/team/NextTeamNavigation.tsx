'use client';

import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import { TeamNavigationContext, type TeamLinkProps, type TeamNavigation } from './TeamNavigation';

function ShellNextLink(props: TeamLinkProps) {
  return <NextLink {...props} />;
}

// Keep Next's browser runtime out of the shared Vite People components.
export default function NextTeamNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const navigation = useMemo<TeamNavigation>(() => ({ pathname, push: router.push, prefetch: router.prefetch, Link: ShellNextLink }), [pathname, router]);
  return <TeamNavigationContext.Provider value={navigation}>{children}</TeamNavigationContext.Provider>;
}
