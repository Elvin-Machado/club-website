import { useEffect, useState } from 'react';

export function Logo({ className = '' }: { className?: string }) {
  return <img className={`brand-mark ${className}`} src="/brain-mark.svg" alt="" width="56" height="56" />;
}

export function Intro() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try { if (!sessionStorage.getItem('nucleus-intro') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setVisible(true); }
    catch { /* The introduction is optional when storage is unavailable. */ }
  }, []);
  useEffect(() => {
    if (!visible) return;
    try { sessionStorage.setItem('nucleus-intro', 'seen'); } catch { /* Storage is optional. */ }
    const timer = window.setTimeout(() => setVisible(false), 1900);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setVisible(false); };
    window.addEventListener('keydown', escape);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', escape); };
  }, [visible]);
  if (!visible) return null;
  return <div className="intro" aria-label="Nucleus logo introduction">
    <button className="intro-skip" onClick={() => setVisible(false)}>Skip intro <span>↗</span></button>
    <div className="intro-center"><div className="intro-orbit" /><Logo /><span className="intro-word">NUCLEUS</span><p>Every connection begins somewhere.</p></div>
    <div className="intro-progress" />
  </div>;
}
