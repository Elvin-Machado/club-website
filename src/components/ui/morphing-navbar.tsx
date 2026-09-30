import { useEffect, useId, useRef, type CSSProperties, type MouseEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { SiteSettings } from '../../types';
import './morphing-navbar.css';

type NavigationItem = { title: string; href: string };
type Props = {
  items: NavigationItem[];
  settings: SiteSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: () => void;
};

// Five bands sweep across the viewport before the links and footer arrive.
const sweepEase = [.16, 1, .3, 1] as const;

export function MorphingNavbar({ items, settings, open, onOpenChange, onApply }: Props) {
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const contentId = useId();
  const reducedMotion = useReducedMotion();
  const socials = [
    { title: 'Instagram', href: settings.instagramUrl },
    { title: 'LinkedIn', href: settings.linkedinUrl },
    { title: 'GitHub', href: settings.githubUrl },
    { title: 'Email', href: 'mailto:' + settings.contactEmail },
  ];

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
        toggle.current?.focus({ preventScroll: true });
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(root.current?.querySelectorAll<HTMLElement>('a[href], button') ?? [])
        .filter(element => !element.closest('[inert]') && element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keyboard);
    };
  }, [open, onOpenChange]);

  const closeForNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    onOpenChange(false);
    toggle.current?.focus({ preventScroll: true });
  };
  const textTransition = (delay: number) => ({
    duration: reducedMotion ? 0 : open ? 1 : .25,
    delay: reducedMotion || !open ? 0 : delay,
    ease: sweepEase,
  });

  return <nav ref={root} className="morph-nav" aria-label="Main navigation" data-open={open}>
    <div className="morph-nav__dialog" role={open ? 'dialog' : undefined} aria-modal={open ? true : undefined} aria-label={open ? 'Navigation menu' : undefined}>
      <div className="morph-nav__pill">
        <Link className="morph-nav__brand" to="/" aria-label="Nucleus home" onClick={closeForNavigation}>Nucleus</Link>
        <button
          type="button"
          className="morph-nav__toggle"
          ref={toggle}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-controls={contentId}
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          <span className="morph-nav__glyph" aria-hidden="true">
            <motion.span initial={false} animate={{ y: open ? 0 : -3, rotate: open ? 45 : 0 }} transition={{ duration: reducedMotion ? 0 : .3 }} />
            <motion.span initial={false} animate={{ y: open ? 0 : 3, rotate: open ? -45 : 0 }} transition={{ duration: reducedMotion ? 0 : .3 }} />
          </span>
        </button>
      </div>

      <motion.div
        id={contentId}
        className="morph-nav__overlay"
        data-lenis-prevent
        aria-hidden={!open}
        inert={!open}
        initial={false}
        animate={{ x: open ? '0%' : '100%' }}
        transition={{ duration: reducedMotion ? 0 : 1, delay: reducedMotion || open ? 0 : .25, ease: sweepEase }}
      >
        <div className="morph-nav__bands" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => <motion.div
            key={index}
            className="morph-nav__band"
            initial={false}
            animate={{ x: open ? '0%' : '100%' }}
            transition={{ duration: reducedMotion || !open ? 0 : 1, delay: reducedMotion ? 0 : open ? index * .075 : 1.25, ease: sweepEase }}
          />)}
        </div>
        <div className="morph-nav__content">
          <div className="morph-nav__main">
            <ul className="morph-nav__links">
              {items.map((item, index) => <motion.li
                key={item.href}
                initial={false}
                animate={{ opacity: open ? 1 : 0, x: open ? 0 : 160 }}
                transition={textTransition(.5 + index * .1)}
              >
                <NavLink className="morph-nav__link" to={item.href} end aria-label={item.title} onClick={closeForNavigation}>
                  <span className="morph-nav__active-dot" aria-hidden="true" />
                  <span className="morph-nav__title" aria-hidden="true">
                    {Array.from(item.title).map((letter, letterIndex) => <span
                      key={letterIndex}
                      className="morph-nav__letter"
                      style={{ '--letter-index': letterIndex } as CSSProperties}
                    >{letter === ' ' ? '\u00a0' : letter}</span>)}
                  </span>
                </NavLink>
              </motion.li>)}
            </ul>
            <ul className="morph-nav__socials" aria-label="Social links">
              {socials.map((item, index) => <motion.li
                key={item.title}
                initial={false}
                animate={{ opacity: open ? 1 : 0, x: open ? 0 : 160 }}
                transition={textTransition(.75 + index * .1)}
              >
                <a href={item.href} target={item.title === 'Email' ? undefined : '_blank'} rel={item.title === 'Email' ? undefined : 'noreferrer'}>{item.title}<ArrowUpRight size={14} aria-hidden="true" /></a>
              </motion.li>)}
            </ul>
          </div>
          <div className="morph-nav__footer">
            <motion.div initial={false} animate={{ opacity: open ? 1 : 0, y: open ? 0 : 100 }} transition={textTransition(.75)}>
              <span className="morph-nav__caption">Made of many minds</span>
              <span>© {new Date().getFullYear()} Nucleus SJEC</span>
            </motion.div>
            <motion.div initial={false} animate={{ opacity: open ? 1 : 0, y: open ? 0 : 100 }} transition={textTransition(.9)}>
              <span className="morph-nav__caption">The community</span>
              <button className="morph-nav__join" onClick={() => { onOpenChange(false); toggle.current?.focus({ preventScroll: true }); onApply(); }}>
                {settings.recruitmentOpen ? 'Join Nucleus' : 'Stay connected'}<ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  </nav>;
}
