'use client';

import { createContext, useContext, type AnchorHTMLAttributes, type ComponentType } from 'react';

export type TeamLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  onNavigate?: (event: { preventDefault: () => void }) => void;
};

export interface TeamNavigation {
  pathname: string;
  push: (href: string) => void;
  prefetch: (href: string) => void;
  Link: ComponentType<TeamLinkProps>;
}

// The primary App Router and the retained Vite entry share these same pages.
export const TeamNavigationContext = createContext<TeamNavigation | null>(null);

export function useTeamNavigation() {
  const navigation = useContext(TeamNavigationContext);
  if (!navigation) throw new Error('People navigation requires TeamShell.');
  return navigation;
}

export function TeamLink(props: TeamLinkProps) {
  const { Link } = useTeamNavigation();
  return <Link {...props} />;
}
