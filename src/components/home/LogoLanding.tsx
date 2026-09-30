import { useEffect, useRef, useState } from 'react';
import logoUrl from '../../../NucleusLogo_transparent.png';
import { MorphingText } from '../magicui/morphing-text';
import './logo-landing.css';

export default function LogoLanding() {
  const sectionRef = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('loading');
  const [formed, setFormed] = useState(false);
  const textReady = formed || status === 'still' || status === 'fallback';

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import('../../lib/scroll-motion').then(({ gsap }) => {
      if (disposed) return;
      const media = gsap.matchMedia();
      cleanup = () => media.revert();
      media.add({ motion: '(prefers-reduced-motion: no-preference)', compact: '(max-width: 760px)' }, context => {
        if (!context.conditions?.motion) return;
        const section = sectionRef.current!;
        gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: .3 },
        })
          .to(host.current, { yPercent: context.conditions.compact ? 6 : 12, scale: .94, opacity: .12 }, 0)
          .to(section.querySelector('.logo-landing__text'), { yPercent: -28, opacity: 0 }, 0);
      }, sectionRef);
    });
    return () => { disposed = true; cleanup?.(); };
  }, []);

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
      setFormed(false);
      setStatus('loading');
      if (motion.matches) { setStatus('still'); return; }
      try {
        const { createLogoScene } = await import('../../lib/logo-scene');
        if (disposed || current !== generation) return;
        const cleanup = await createLogoScene(element, logoUrl, () => {
          if (!disposed && current === generation) setStatus('fallback');
        }, () => {
          if (!disposed && current === generation) setFormed(true);
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

  return <section ref={sectionRef} className="logo-landing" aria-label="Nucleus" data-status={status} data-text-ready={textReady}>
    <h1 className="sr-only">Nucleus SJEC — A connection worth making.</h1>
    <div className="logo-landing__scene" ref={host} role="img" aria-label="The Nucleus brain logo assembles from a field of luminous particles." />
    {/* Crop the supplied PNG's transparent padding without changing the asset. */}
    <svg className="logo-landing__fallback" viewBox="430 128 672 625" aria-hidden="true">
      <image href={logoUrl} width="1599" height="899" />
    </svg>
    <div className="logo-landing__text">
      <MorphingText texts={['THE NUCLEUS CLUB', 'CREATE', 'EXPLORE', 'INNOVATE']} active={textReady} />
    </div>
  </section>;
}
