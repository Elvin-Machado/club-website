import { Calendar, Folder, Home, Lightbulb, Users, type LucideIcon } from 'lucide-react';

/**
 * Single source of truth for the site navigation.
 *
 * The club pages and the team page ship separate headers, so both read their
 * items from here to stay identical in labels, order and coverage.
 */
export type NavLink = { label: string; href: string; icon: LucideIcon };

export const navLinks = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'The idea', href: '/about', icon: Lightbulb },
  { label: 'Experiences', href: '/events', icon: Calendar },
  { label: 'Our work', href: '/projects', icon: Folder },
  { label: 'The people', href: '/team', icon: Users },
] as const satisfies readonly NavLink[];

/** True when `href` is the page currently being viewed. */
export function isCurrentNavItem(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
