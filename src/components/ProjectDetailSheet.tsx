'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check, Github, Layers3, Mail, X } from 'lucide-react';
import type { DeckProject } from '../lib/projects';
import type { SiteSettings } from '../types';

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface ProjectDetailSheetProps {
  project: DeckProject | null;
  settings: Pick<SiteSettings, 'contactEmail'>;
  triggerRef: { current: HTMLElement | null };
  onClose: () => void;
}

export default function ProjectDetailSheet({ project, settings, triggerRef, onClose }: ProjectDetailSheetProps) {
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!project) return;

    const newlyOpened = lastIdRef.current !== project.id;
    lastIdRef.current = project.id;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let raf = 0;
    if (newlyOpened) {
      raf = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [project, onClose, triggerRef]);

  return (
    <AnimatePresence>
      {project && (
        <div className="sheet-root" key={project.id}>
          <motion.div
            className="sheet-backdrop"
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.32, ease }}
          />
          <motion.section
            className="sheet-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`sheet-title-${project.id}`}
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={reduced ? { duration: 0 } : { duration: 0.5, ease }}>
            <header className="sheet-head">
              <div className="sheet-heading">
                <span className="sheet-kicker">
                  {project.category}
                  {project.isPlaceholder && <em className="sheet-concept"> · Concept</em>}
                </span>
                <h2 id={`sheet-title-${project.id}`}>{project.title}</h2>
              </div>
              <button ref={closeRef} type="button" className="sheet-close" aria-label="Close project details" onClick={onClose}>
                <X size={20} strokeWidth={1.5} />
              </button>
            </header>

            <div className="sheet-scroll">
              <figure className="sheet-art">
                <img src={project.image} alt={`${project.title} project visual`} width={800} height={640} draggable={false} />
                {project.isPlaceholder && <figcaption className="sheet-placeholder-note"><Layers3 size={13} strokeWidth={1.4} /> Conceptual placeholder — replaceable with a real build</figcaption>}
              </figure>

              <div className="sheet-body">
                <p className="sheet-lead">{project.objective || project.description}</p>
                <p className="sheet-full">{project.fullDescription}</p>

                {project.features.length > 0 && (
                  <section className="sheet-block">
                    <h3>Key features</h3>
                    <ul className="sheet-features">
                      {project.features.map(feature => <li key={feature}><Check size={13} strokeWidth={2} /><span>{feature}</span></li>)}
                    </ul>
                  </section>
                )}

                {project.tech.length > 0 && (
                  <section className="sheet-block">
                    <h3>Built with</h3>
                    <div className="sheet-chips">{project.tech.map(item => <span key={item}>{item}</span>)}</div>
                  </section>
                )}

                <section className="sheet-block">
                  <h3>Filed under</h3>
                  <div className="sheet-chips sheet-chips-muted">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
                </section>

                <div className="sheet-actions">
                  {project.url && (
                    <a className="button primary" href={project.url} target="_blank" rel="noreferrer">
                      View project <ArrowUpRight size={16} />
                    </a>
                  )}
                  {project.repositoryUrl && (
                    <a className="button outline" href={project.repositoryUrl} target="_blank" rel="noreferrer">
                      Source code <Github size={16} />
                    </a>
                  )}
                  <a className="text-link" href={`mailto:${settings.contactEmail}?subject=${encodeURIComponent(`Tell me about ${project.title}`)}`}>
                    Discuss this project <Mail size={16} />
                  </a>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}