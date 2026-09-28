'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Router, createPath, type Navigator } from 'react-router-dom';
import App from '../App';
import Admin from '../vite-pages/Admin';

/**
 * Renders the club pages (home, experiences, work, people) inside Next.js.
 *
 * The club pages are a react-router app; this bridges Next's router to it so
 * they can be served from the App Router without rewriting them.
 */
export default function ExistingSite({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const navigator = useMemo<Navigator>(() => ({
    createHref: to => typeof to === 'string' ? to : createPath(to),
    go: delta => window.history.go(delta),
    push: to => router.push(typeof to === 'string' ? to : createPath(to)),
    replace: to => router.replace(typeof to === 'string' ? to : createPath(to)),
  }), [router]);
  return admin ? <Admin /> : <Router location={pathname ?? '/'} navigator={navigator}><App /></Router>;
}
