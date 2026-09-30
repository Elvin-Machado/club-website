"use client";

import { useEffect, useRef } from 'react';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { TextReveal } from '../ui/text-reveal';
import './domain-parallax.css';

export type DomainItem = {
  id: string; num: string; title: string; subtitle: string; description: string;
  tags: readonly string[];
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  onClick: () => void; whatsappUrl?: string;
};


export default function DomainParallax({ domains }: { domains: DomainItem[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import('../../lib/scroll-motion').then(({ gsap, ScrollTrigger }) => {
      if (disposed) return;
      const media = gsap.matchMedia();
      cleanup = () => media.revert();
      media.add({ motion: '(prefers-reduced-motion: no-preference)', compact: '(max-width: 760px)' }, context => {
        if (!context.conditions?.motion) return;
        section.dataset.motion = 'true';
        const compact = context.conditions.compact;
        const surfaces = Array.from(section.querySelectorAll<HTMLElement>('.dp-panel__inner'));
        surfaces.forEach(surface => {
          // Give the pop a longer scroll range and a soft settle in both directions.
          gsap.fromTo(surface, { y: compact ? 20 : 38, scale: .94, opacity: 0 }, {
            y: 0, scale: 1, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: surface.parentElement, start: 'top 96%', end: 'top 42%', scrub: compact ? .35 : .65 },
          });
        });
        ScrollTrigger.refresh(true);
        return () => { delete section.dataset.motion; };
      }, section);
    }).catch(() => { /* Static content remains readable if the enhancement cannot load. */ });
    return () => { disposed = true; cleanup?.(); };
  }, []);

  return <section className="dp-section" ref={sectionRef} id="domains" aria-labelledby="domains-title">
    <div className="dp-sticky">
      <div className="dp-header"><TextReveal as="p" className="dp-eyebrow" text="Our Domains" blur="4px" />
        <h2 className="dp-title" id="domains-title" aria-label="Three paths. Infinite directions."><TextReveal className="dp-line-1" text={'THREE\u00a0PATHS.'} /><br /><TextReveal className="dp-title-teal dp-line-2" text={'INFINITE\u00a0DIRECTIONS.'} delay={.12} /></h2>
      </div>
      {domains.map(domain => <div className="dp-panel" key={domain.id} role="region" aria-label={`${domain.title} detail`}>
        <div className="dp-panel__inner">
          <div className="dp-panel__head"><div className="dp-panel__icon-wrap"><domain.icon size={28} strokeWidth={2} /></div><div className="dp-panel__heading"><span className="dp-panel__num">/{domain.num}</span><TextReveal as="h2" className="dp-panel__title" text={domain.title} mode="word" blur="4px" /><TextReveal as="p" className="dp-panel__subtitle" text={domain.subtitle} mode="word" blur="4px" /></div></div>
          <TextReveal as="p" className="dp-panel__desc" text={domain.description} mode="word" blur="4px" /><div className="dp-panel__tags">{domain.tags.map(tag => <span className="dp-panel__tag" key={tag}>{tag}</span>)}</div>
          <div className="dp-panel__actions"><button className="dp-panel__button dp-panel__button--explore" onClick={domain.onClick}><TextReveal text="Explore domain" blur="4px" y={6} /> <ArrowUpRight size={18} /></button>
            {domain.whatsappUrl && <a className="dp-panel__button dp-panel__button--whatsapp" href={domain.whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} /><TextReveal text="Join WhatsApp Community" mode="word" blur="4px" y={6} /></a>}
          </div>
        </div>
      </div>)}
    </div>
  </section>;
}
