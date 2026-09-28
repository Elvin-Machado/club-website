import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, type MotionValue } from 'framer-motion';
import './floating-dock.css';

type Item = { title: string; icon: ReactNode; href: string };

function DockIcon({ item, mouseX }: { item: Item; mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const distance = useTransform(mouseX, value => {
    const rect = ref.current?.getBoundingClientRect();
    return rect ? value - rect.x - rect.width / 2 : Infinity;
  });
  const size = useSpring(useTransform(distance, [-120, 0, 120], [40, 64, 40]), { mass: .1, stiffness: 180, damping: 15 });
  const iconSize = useSpring(useTransform(distance, [-120, 0, 120], [19, 30, 19]), { mass: .1, stiffness: 180, damping: 15 });
  return <NavLink ref={ref} className="fd-link" to={item.href} end onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
    <motion.span className="fd-item" style={{ width: reduced ? 40 : focused ? 58 : size, height: reduced ? 40 : focused ? 58 : size }}>
      <motion.span className="fd-icon-container" aria-hidden="true" style={{ width: reduced ? 19 : iconSize, height: reduced ? 19 : iconSize }}>{item.icon}</motion.span>
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
