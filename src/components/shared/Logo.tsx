<<<<<<< HEAD
const logoUrl = '/NucleusLogo_transparent.png';
=======
<<<<<<< HEAD
import { useEffect, useState } from 'react';
<<<<<<< HEAD:src/components/Logo.tsx
=======
import logoUrl from '../../../NucleusLogo_transparent.png';
>>>>>>> b06a06e2a497e685278611b3410b77e96aadc635:src/components/shared/Logo.tsx

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
=======
import { useEffect, useState } from 'react';
import logoUrl from '../../NucleusLogo_transparent.png';
>>>>>>> e6a133606ce9d4b7d43c220df69bac3528f841ae

export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg className={`brand-mark ${className}`} viewBox="430 128 672 625" aria-hidden="true" width="56" height="56">
      <image href={logoUrl} width="1599" height="899" />
    </svg>
  );
}
<<<<<<< HEAD
=======

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
>>>>>>> 24551fe568b8ad3d66a35507c45e3569b24f2d26
>>>>>>> e6a133606ce9d4b7d43c220df69bac3528f841ae
