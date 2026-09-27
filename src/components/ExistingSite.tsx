'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Router, createPath, type Navigator } from 'react-router-dom';
import App from '../App';
import Admin from '../Admin';

/** Keeps the existing club pages usable during the App Router migration. */
export default function ExistingSite({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const navigator = useMemo<Navigator>(() => ({
    createHref: to => typeof to === 'string' ? to : createPath(to),
    go: delta => window.history.go(delta),
    push: to => router.push(typeof to === 'string' ? to : createPath(to)),
    replace: to => router.replace(typeof to === 'string' ? to : createPath(to)),
  }), [router]);
  return admin ? <Admin /> : <Router location={pathname} navigator={navigator}><App /></Router>;
}
