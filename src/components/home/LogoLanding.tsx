<<<<<<< HEAD:src/components/LogoLanding.tsx
﻿import { useEffect, useRef, useState } from 'react';
const logoUrl = '/NucleusLogo_transparent.png';
import { MorphingText } from './magicui/morphing-text';
=======
import { useEffect, useRef, useState } from 'react';
import logoUrl from '../../../NucleusLogo_transparent.png';
import { MorphingText } from '../magicui/morphing-text';
>>>>>>> b06a06e2a497e685278611b3410b77e96aadc635:src/components/home/LogoLanding.tsx
import './logo-landing.css';

export default function LogoLanding() {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const element = host.current!;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let generation = 0;
    let disposeScene: (() => void) | undefined;

    async function start() {
      const current = ++generation;
      disposeScene?.();
      disposeScene = undefined;
      setStatus('loading');
      if (motion.matches) { setStatus('still'); return; }
      try {
        const { createLogoScene } = await import('../../lib/logo-scene');
        if (disposed || current !== generation) return;
        const cleanup = await createLogoScene(element, logoUrl, () => {
          if (!disposed && current === generation) setStatus('fallback');
        });
        if (disposed || current !== generation) cleanup();
        else {
          disposeScene = cleanup;
          setStatus('ready');
        }
      } catch (err) {
        console.error('Logo animation failed:', err);
        if (!disposed && current === generation) setStatus('fallback');
      }
    }

    void start();
    motion.addEventListener('change', start);
    return () => {
      disposed = true;
      generation++;
      motion.removeEventListener('change', start);
      disposeScene?.();
    };
  }, []);

  return <section className="logo-landing" aria-label="Nucleus" data-status={status}>
    <h1 className="sr-only">Nucleus SJEC — A connection worth making.</h1>
    <div className="logo-landing__scene" ref={host} role="img" aria-label="The Nucleus brain logo assembles from a field of luminous particles." />
    {/* Crop the supplied PNG's transparent padding without changing the asset. */}
    <svg className="logo-landing__fallback" viewBox="430 128 672 625" aria-hidden="true">
      <image href={logoUrl} width="1599" height="899" />
    </svg>
    <div className="logo-landing__text">
      <MorphingText texts={['THE NUCLEUS CLUB', 'CREATE', 'EXPLORE', 'INNOVATE']} />
    </div>
  </section>;
}
