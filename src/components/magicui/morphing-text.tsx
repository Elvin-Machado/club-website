import { useEffect, useId, useRef } from 'react';

export function MorphingText({ texts, className = '' }: { texts: string[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLSpanElement>(null);
  const second = useRef<HTMLSpanElement>(null);
  const filterId = useId().replace(/:/g, '');
  const key = texts.join('\u0000');
  useEffect(() => {
    const words = key.split('\u0000');
    const a = first.current!, b = second.current!;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, previous = 0, elapsed = 0, visible = true;
    const paint = (fraction: number, index: number) => {
      a.textContent = words[index % words.length]; b.textContent = words[(index + 1) % words.length];
      b.style.filter = `blur(${Math.min(8 / Math.max(fraction, .001) - 8, 100)}px)`;
      b.style.opacity = String(Math.pow(fraction, .4));
      const inverse = 1 - fraction;
      a.style.filter = `blur(${Math.min(8 / Math.max(inverse, .001) - 8, 100)}px)`;
      a.style.opacity = String(Math.pow(inverse, .4));
    };
    const animate = (now: number) => {
      if (previous) elapsed += Math.min((now - previous) / 1000, .05);
      previous = now;
      const index = Math.floor(elapsed / 2), phase = elapsed % 2;
      paint(Math.max(0, (phase - .5) / 1.5), index);
      frame = requestAnimationFrame(animate);
    };
    const sync = () => {
      cancelAnimationFrame(frame); previous = 0;
      if (media.matches) { paint(0, 0); return; }
      if (visible && !document.hidden && words.length > 1) frame = requestAnimationFrame(animate);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    if (ref.current) observer.observe(ref.current);
    sync(); media.addEventListener('change', sync); document.addEventListener('visibilitychange', sync);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); media.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
  }, [key]);
  return <div ref={ref} className={`mu-morph-wrap ${className}`} aria-label={texts.join('. ')}>
    <div className="mu-morph-layers" style={{ filter: `url(#${filterId}) blur(.6px)` }} aria-hidden="true"><span className="mu-layer" ref={first}>{texts[0]}</span><span className="mu-layer" ref={second} style={{ opacity: 0 }}>{texts[1]}</span></div>
    <svg style={{ position: 'absolute', height: 0, width: 0 }} aria-hidden="true"><defs><filter id={filterId} x="-20%" y="-20%" width="140%" height="140%"><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 255 -140" /></filter></defs></svg>
  </div>;
}
