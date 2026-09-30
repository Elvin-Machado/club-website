"use client";

import { useEffect, useId, useRef } from 'react';

export function MorphingText({ texts, className = '', active = true }: { texts: string[]; className?: string; active?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLSpanElement>(null);
  const second = useRef<HTMLSpanElement>(null);
  const filterId = useId().replace(/:/g, '');
  const key = texts.join('\u0000');
  useEffect(() => {
    const words = key.split('\u0000');
    const a = first.current!, b = second.current!;
    const layers = a.parentElement!;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 760px)');
    const hold = 2.6, morph = .95, cycle = hold + morph;
    let frame = 0, timer = 0, elapsed = 0, visible = true;
    let startedAt: number | null = null;
    let lastIndex = -1, lastFraction = -1;
    const paint = (fraction: number, index: number) => {
      if (lastIndex === index && lastFraction === fraction) return;
      if (lastIndex !== index) {
        a.textContent = words[index % words.length]; b.textContent = words[(index + 1) % words.length];
        lastIndex = index;
      }
      lastFraction = fraction;
      // Keep the signature morph brief and bounded; held words need no filter or DOM writes.
      if (fraction === 0) {
        layers.style.filter = 'none';
        a.style.filter = b.style.filter = 'none';
        a.style.opacity = '1'; b.style.opacity = '0';
        a.style.transform = b.style.transform = 'none';
        layers.style.willChange = 'auto';
        return;
      }
      // Magic UI's threshold morph, with a small directional hand-off. Keep
      // the liquid interval short and the held words completely crisp.
      layers.style.filter = `url(#${filterId})`;
      layers.style.willChange = 'filter';
      const blur = compact.matches ? 5 : 8;
      b.style.filter = `blur(${Math.min(2.5 / Math.max(fraction, .001) - 2.5, blur)}px)`;
      b.style.opacity = String(Math.pow(fraction, .4));
      const inverse = 1 - fraction;
      a.style.filter = `blur(${Math.min(2.5 / Math.max(inverse, .001) - 2.5, blur)}px)`;
      a.style.opacity = String(Math.pow(inverse, .4));
      a.style.transform = `translateY(${-fraction * 8}px) scale(${1 + fraction * .035})`;
      b.style.transform = `translateY(${inverse * 10}px) scale(${.965 + fraction * .035})`;
    };
    const animate = (now: number) => {
      if (startedAt === null) return;
      const time = elapsed + (now - startedAt) / 1000;
      const index = Math.floor(time / cycle), phase = time % cycle;
      const progress = Math.max(0, (phase - hold) / morph);
      paint(progress * progress * progress * (progress * (progress * 6 - 15) + 10), index);
      // A held word needs no animation loop. Resume only when its morph begins.
      if (phase < hold) timer = window.setTimeout(() => { frame = requestAnimationFrame(animate); }, (hold - phase) * 1000);
      else frame = requestAnimationFrame(animate);
    };
    const sync = () => {
      cancelAnimationFrame(frame); clearTimeout(timer);
      const now = performance.now();
      if (startedAt !== null) elapsed += (now - startedAt) / 1000;
      startedAt = null;
      if (!active || media.matches) { elapsed = 0; paint(0, 0); return; }
      if (visible && !document.hidden && words.length > 1) {
        startedAt = now;
        frame = requestAnimationFrame(animate);
      }
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    if (ref.current) observer.observe(ref.current);
    sync(); media.addEventListener('change', sync); document.addEventListener('visibilitychange', sync);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); startedAt = null; observer.disconnect(); media.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
  }, [key, filterId, active]);
  return <div ref={ref} className={`mu-morph-wrap ${className}`} aria-label={texts.join('. ')}>
    <div className="mu-morph-layers" aria-hidden="true"><span className="mu-layer" ref={first}>{texts[0]}</span><span className="mu-layer" ref={second} style={{ opacity: 0 }}>{texts[1]}</span></div>
    <svg style={{ position: 'absolute', height: 0, width: 0 }} aria-hidden="true"><defs><filter id={filterId} x="-10%" y="-20%" width="120%" height="140%" colorInterpolationFilters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 32 -15" /></filter></defs></svg>
  </div>;
}
