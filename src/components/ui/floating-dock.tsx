import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, type MotionValue } from 'motion/react';
import './floating-dock.css';

type Item = { title: string; icon: ReactNode; href: string };

function DockIcon({ item, mouseX }: { item: Item; mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = useReducedMotion();
  const focus = useMotionValue(0);
  const center = useRef(Infinity);
  useEffect(() => {
    const measure = () => {
      const rect = ref.current?.getBoundingClientRect();
      center.current = rect ? rect.left + rect.width / 2 : Infinity;
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (ref.current?.parentElement) observer.observe(ref.current.parentElement);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  const distance = useTransform(mouseX, value => {
    return Number.isFinite(value) ? value - center.current : Infinity;
  });
  const proximity = useTransform(distance, [-120, 0, 120], [0, 1, 0]);
  const emphasis = useSpring(useTransform(() => Math.max(proximity.get(), focus.get())), { mass: .55, stiffness: 240, damping: 25 });
  const scale = useTransform(emphasis, [0, 1], [1, 1.45]);
  const y = useTransform(emphasis, [0, 1], [0, -9]);
  return <NavLink ref={ref} className="fd-link" to={item.href} end onFocus={() => focus.set(.8)} onBlur={() => focus.set(0)}>
    <motion.span className="fd-item" style={{ scale: reduced ? 1 : scale, y: reduced ? 0 : y }}>
      <span className="fd-icon-container" aria-hidden="true">{item.icon}</span>
    </motion.span>
    <span className="fd-title-always">{item.title}</span>
  </NavLink>;
}

export function FloatingDock({ items }: { items: Item[] }) {
  const mouseX = useMotionValue(Infinity);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const id = useId();
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <nav className="site-navigation" aria-label="Main navigation" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <div className="fd-desktop" onMouseMove={event => mouseX.set(event.clientX)} onMouseLeave={() => mouseX.set(Infinity)}>
      {items.map(item => <DockIcon key={item.href} item={item} mouseX={mouseX} />)}
    </div>
    <div className="fd-mobile">
      <button className="fd-mobile-toggle icon-button" ref={toggle} aria-label={open ? 'Close menu' : 'Open menu'} aria-controls={id} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
      {open && <div id={id} className="fd-mobile-nav">{items.map((item, index) => <NavLink key={item.href} className="fd-mobile-link" to={item.href} end onClick={() => setOpen(false)} style={{ animationDelay: `${index * 35}ms` }}><span>{item.title}</span><span className="fd-mobile-icon" aria-hidden="true">{item.icon}</span></NavLink>)}</div>}
    </div>
  </nav>;
}
