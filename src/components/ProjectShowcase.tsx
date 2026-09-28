'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight, Github, Layers3 } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Project, SiteSettings } from '../types';
import { buildDeckProjects, type DeckProject } from '../lib/projects';
import ProjectDetailSheet from './ProjectDetailSheet';
import './project-showcase.css';

gsap.registerPlugin(ScrollTrigger);

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const number = (value: number) => String(value).padStart(2, '0');
const SWIPE_DISTANCE = 64;
const SWIPE_VELOCITY = 0.4;

interface DeckSlideProps {
  project: DeckProject;
  index: number;
  total: number;
  direction: number;
  reduced: boolean;
  onNavigate: (delta: number) => void;
  onExplore: (project: DeckProject, trigger: HTMLElement | null) => void;
}

function DeckSlide({ project, index, total, direction, reduced, onNavigate, onExplore }: DeckSlideProps) {
  const slideEl = useRef<HTMLElement>(null);
  const gestureRef = useRef(false);

  const variants = {
    enter: (dir: number) => ({ x: reduced ? '0%' : dir >= 0 ? '108%' : '-108%', opacity: 1 }),
    center: { x: '0%', opacity: 1 },
    exit: (dir: number) => ({ x: reduced ? '0%' : dir >= 0 ? '-108%' : '108%', opacity: 1 }),
  };

  const handleOpen = (trigger: HTMLElement | null) => {
    if (gestureRef.current) {
      gestureRef.current = false;
      return;
    }
    onExplore(project, trigger ?? slideEl.current);
  };

  return (
    <motion.article
      className="deck-slide"
      ref={slideEl}
      aria-label={`${project.title} — project ${number(index + 1)} of ${number(total)}`}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={reduced ? { duration: 0 } : { x: { duration: 0.62, ease }, opacity: { duration: 0.2 } }}
      drag={reduced ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.22}
      dragMomentum={false}
      onPointerDown={() => { gestureRef.current = false; }}
      onDragStart={() => { gestureRef.current = false; }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 12) gestureRef.current = true;
        if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onNavigate(1);
        else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onNavigate(-1);
      }}>
      <button type="button" className="deck-visual" onClick={e => handleOpen(e.currentTarget)} aria-label={`Explore ${project.title}`}>
        <img src={project.image} alt={`${project.title} project visual`} width={800} height={640} draggable={false} />
        <span className="deck-visual-top" aria-hidden="true">
          <span className="deck-visual-index">{number(index + 1)}</span>
          {project.isPlaceholder && <span className="deck-chip">CONCEPT</span>}
        </span>
      </button>
      <div className="deck-copy">
        <div className="deck-copy-meta">
          <span className="deck-category">{project.category}</span>
          {project.isPlaceholder && <span className="deck-chip deck-chip-inline">CONCEPTUAL SHOWCASE</span>}
        </div>
        <h2>{project.title}</h2>
        <p>{project.description}</p>
        <div className="deck-tags" aria-label={`${project.title} tags`}>
          {project.tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
        <div className="deck-actions">
          <button type="button" className="button primary deck-explore" onClick={e => handleOpen(e.currentTarget)}>
            Explore project <ArrowUpRight size={16} />
          </button>
          {project.url && <a className="text-link" href={project.url} target="_blank" rel="noreferrer">Live project <ArrowUpRight size={16} /></a>}
          {project.repositoryUrl && <a className="text-link" href={project.repositoryUrl} target="_blank" rel="noreferrer"><Github size={16} /> Source code</a>}
        </div>
      </div>
    </motion.article>
  );
}

interface ProjectShowcaseProps {
  projects: Project[];
  settings: Pick<SiteSettings, 'githubUrl' | 'contactEmail'>;
}

export default function ProjectShowcase({ projects, settings }: ProjectShowcaseProps) {
  const reduced = useReducedMotion();
  const deck = buildDeckProjects(projects);
  const total = deck.length;

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const exploreTrigger = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const activeProject = deck[activeIndex] ?? null;
  const openProject = deck.find(project => project.id === openId) ?? null;

  // Reset navigation when the fetched project list changes length.
  useEffect(() => {
    indexRef.current = 0;
    setActiveIndex(0);
    setDirection(0);
  }, [total]);

  const step = useCallback((delta: number) => {
    if (!total) return;
    setDirection(delta);
    indexRef.current = (indexRef.current + delta + total) % total;
    setActiveIndex(indexRef.current);
  }, [total]);

  const jumpTo = useCallback((target: number) => {
    if (target === indexRef.current || !total) return;
    const forward = (target - indexRef.current + total) % total;
    const backward = (indexRef.current - target + total) % total;
    setDirection(forward <= backward ? 1 : -1);
    indexRef.current = target;
    setActiveIndex(indexRef.current);
  }, [total]);

  const openSheet = useCallback((project: DeckProject, trigger: HTMLElement | null) => {
    exploreTrigger.current = trigger;
    setOpenId(project.id);
  }, []);

  const closeSheet = useCallback(() => setOpenId(null), []);

  // Cinematic section entrance, tied to scroll. Skipped for reduced motion.
  useEffect(() => {
    const stage = stageRef.current;
    const section = sectionRef.current;
    if (!stage || !section || !total) return;
    if (reduced) {
      gsap.set(stage, { opacity: 1, y: 0 });
      return;
    }
    const tween = gsap.fromTo(stage, { opacity: 0, y: 46 }, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: section, start: 'top 82%', once: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [reduced, total]);

  return <section className="work-showcase section-wrap" id="projects" aria-labelledby="work-heading" ref={sectionRef}>
    <div className="section-heading work-eyebrow-row">
      <span className="eyebrow"><span className="section-number">03</span> IDEAS IN THE REAL WORLD</span>
      <a className="text-link" href={settings.githubUrl} target="_blank" rel="noreferrer">Our GitHub <ArrowUpRight size={16} /></a>
    </div>
    <div className="work-heading-row">
      <h1 id="work-heading">Less someday.<br /><span>More <em>built it.</em></span></h1>
      <p>Real problems. Fresh perspectives.<br />A little of what happens when curious minds<br className="work-desktop-break" /> get together and make something.</p>
    </div>

    {!total ? <div className="empty-state">The next project is taking shape. Follow our GitHub for updates.</div> : <>
      <div className="work-collection-label">
        <span><Layers3 size={14} strokeWidth={1.4} /> THE PROJECT FILES</span>
        <span>{number(total)} PROJECT{total === 1 ? '' : 'S'} / CURATED AT NUCLEUS</span>
      </div>

      <div className="work-deck">
        <div className="work-deck-glow" aria-hidden="true" />
        <div className="work-stage" ref={stageRef} role="group" aria-roledescription="carousel" aria-label="Project deck">
          <AnimatePresence initial={false} custom={direction}>
            {activeProject && <DeckSlide key={activeProject.id} project={activeProject} index={activeIndex} total={total} direction={direction}
              reduced={!!reduced} onNavigate={step} onExplore={openSheet} />}
          </AnimatePresence>
        </div>

        <div className="work-deck-controls">
          <button type="button" className="work-nav-button" aria-label="Previous project" onClick={() => step(-1)}><ChevronLeft size={18} /></button>
          <div className="work-progress" role="group" aria-label="Jump to project">
            {deck.map((project, index) => (
              <button type="button" key={project.id} className={`work-progress-marker${index === activeIndex ? ' is-active' : ''}`}
                aria-label={`Go to ${project.title}`} aria-current={index === activeIndex ? 'step' : undefined}
                onClick={() => jumpTo(index)}>
                <motion.span animate={{ scaleX: index === activeIndex ? 1 : 0.3, opacity: index === activeIndex ? 1 : 0.45 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.35, ease }} />
              </button>
            ))}
          </div>
          <button type="button" className="work-nav-button" aria-label="Next project" onClick={() => step(1)}><ChevronRight size={18} /></button>
          <span className="work-deck-counter" aria-live="polite">{number(activeIndex + 1)} / {number(total)}</span>
        </div>
        <div className="work-deck-hint"><span className="status-dot" />Browse the builds. Pick one to unpack.</div>
      </div>
    </>}

    <div className="work-endnote"><span>SMALL SPARKS. REAL-WORLD POSSIBILITIES.</span><span>ALWAYS A WORK IN PROGRESS <span aria-hidden="true">↗</span></span></div>

    <ProjectDetailSheet project={openProject} settings={settings} triggerRef={exploreTrigger} onClose={closeSheet} />
  </section>;
}