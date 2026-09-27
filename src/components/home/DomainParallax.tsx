import { useEffect, useRef } from 'react';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { CardContainer, CardBody, CardItem } from '../ui/3d-card';
import './domain-parallax.css';

export type DomainItem = {
  id: string; num: string; title: string; subtitle: string; description: string;
  tags: readonly string[];
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  onClick: () => void; whatsappUrl?: string;
};

const letters = (text: string) => text.split('').map((char, i) => <span key={i} className="dp-letter">{char === ' ' ? '\u00a0' : char}</span>);

export default function DomainParallax({ domains }: { domains: DomainItem[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import('../../lib/scroll-motion').then(({ gsap }) => {
      if (disposed) return;
      const media = gsap.matchMedia();
      cleanup = () => media.revert();
      media.add({ motion: '(prefers-reduced-motion: no-preference)', compact: '(max-width: 760px)' }, context => {
      if (!context.conditions?.motion) return;
      const compact = context.conditions.compact;
      const cards = Array.from(section.querySelectorAll<HTMLElement>('.dp-card-wrapper'));
      const panels = Array.from(section.querySelectorAll<HTMLElement>('.dp-panel'));
      const overlay = section.querySelector('.dp-overlay');
      gsap.set(cards, { y: compact ? 38 : 64, opacity: 0, scale: .92, rotation: index => (index - 1) * (compact ? 1 : 2), transformOrigin: '50% 80%' });
      cards.forEach(card => { card.inert = true; });
      gsap.set(panels, { autoAlpha: 0 });
      gsap.set(section.querySelectorAll('.dp-panel__inner'), { y: compact ? 28 : 48, scale: .92, transformOrigin: '50% 60%' });
      gsap.set(section.querySelectorAll('.dp-panel__head, .dp-panel__desc, .dp-panel__tag, .dp-panel__actions'), { opacity: 0, y: compact ? 10 : 18 });
      gsap.set(overlay, { opacity: 0 });
      gsap.set(section.querySelectorAll('.dp-letter'), { opacity: 0, filter: `blur(${compact ? 4 : 6}px)`, y: compact ? 12 : 22 });
      const tl = gsap.timeline({
        onUpdate: () => {
          const panelActive = panels.some(panel => Number(gsap.getProperty(panel, 'opacity')) > .15);
          panels.forEach(panel => { panel.inert = Number(gsap.getProperty(panel, 'opacity')) < .8; });
          cards.forEach(card => { card.inert = panelActive || Number(gsap.getProperty(card, 'opacity')) < .6; });
        },
        scrollTrigger: {
        trigger: section, start: 'top top', end: 'bottom bottom', scrub: compact ? .65 : 1,
      }});
      tl.fromTo(section.querySelector('.dp-eyebrow'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45 })
        .to(section.querySelectorAll('.dp-line-1 .dp-letter'), { opacity: 1, filter: 'blur(0px)', y: 0, duration: .65, stagger: { amount: .45 }, ease: 'power3.out' }, '-=.2')
        .to(section.querySelectorAll('.dp-line-2 .dp-letter'), { opacity: 1, filter: 'blur(0px)', y: 0, duration: .65, stagger: { amount: .65 }, ease: 'power3.out' }, '-=.55')
        .to({}, { duration: .25 });
      cards.forEach((card, index) => tl.to(card, { y: 0, opacity: 1, scale: 1, rotation: 0, duration: .85, ease: 'back.out(1.35)' }, index ? '-=.65' : '>'));
      tl.to({}, { duration: .6 });
      panels.forEach((panel, index) => {
        tl.to(cards.filter((_, i) => i !== index), { opacity: .2, scale: .94, filter: `blur(${compact ? 1 : 3}px)`, duration: .6 })
          .to(cards[index], { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .55, ease: 'expo.out' }, '<')
          .to(overlay, { opacity: 1, duration: .5 }, '<.15')
          .to(panel, { autoAlpha: 1, duration: .35 })
          .to(panel.querySelector('.dp-panel__inner'), { y: 0, scale: 1, duration: .8, ease: 'back.out(1.25)' }, '<')
          .to(panel.querySelectorAll('.dp-panel__head, .dp-panel__desc, .dp-panel__tag, .dp-panel__actions'), { opacity: 1, y: 0, stagger: .055, duration: .45, ease: 'power3.out' }, '<.12')
          .to({}, { duration: 1.4 })
          .to(panel, { autoAlpha: 0, duration: .4 })
          .to(panel.querySelector('.dp-panel__inner'), { y: compact ? -20 : -32, scale: .97, duration: .5, ease: 'power2.inOut' }, '<')
          .to(overlay, { opacity: 0, duration: .4 }, '<');
      });
      tl.to(cards, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .6 });
      return () => { panels.forEach(panel => { panel.inert = true; }); cards.forEach(card => { card.inert = false; }); };
      }, section);
    });
    return () => { disposed = true; cleanup?.(); };
  }, []);

  return <section className="dp-section" ref={sectionRef} id="domains" aria-labelledby="domains-title">
    <div className="dp-sticky">
      <div className="dp-header"><p className="dp-eyebrow">Our Domains</p>
        <h2 className="dp-title" id="domains-title" aria-label="Three paths. Infinite directions."><span className="dp-line-1" aria-hidden="true">{letters('THREE PATHS.')}</span><br /><span className="dp-title-teal dp-line-2" aria-hidden="true">{letters('INFINITE DIRECTIONS.')}</span></h2>
      </div>
      <div className="dp-cards-row">{domains.map(domain => <div key={domain.id} className="dp-card-wrapper">
        <CardContainer className="inter-var" containerClassName="dp-card-container"><CardBody>
          <button className="dp-card" onClick={domain.onClick} aria-label={`${domain.title} ${domain.subtitle}`}>
            <CardItem translateZ="50" className="dp-card__icon-row"><domain.icon size={28} strokeWidth={1.2} /><span className="dp-card__num">/{domain.num}</span></CardItem>
            <CardItem translateZ="60"><h3 className="dp-card__title">{domain.title}</h3><p className="dp-card__subtitle">{domain.subtitle}</p></CardItem>
            <CardItem as="p" translateZ="70" className="dp-card__desc">{domain.description}</CardItem>
            <CardItem translateZ="90" className="dp-card__tags">{domain.tags.map(tag => <span className="dp-card__tag" key={tag}>{tag}</span>)}</CardItem>
            <CardItem translateZ="110" className="dp-card__cta">Find your spark <ArrowUpRight size={14} /></CardItem>
          </button>
        </CardBody></CardContainer>
      </div>)}</div>
      <div className="dp-overlay" aria-hidden="true" />
      {domains.map(domain => <div className="dp-panel" key={domain.id} inert role="region" aria-label={`${domain.title} detail`}>
        <div className="dp-panel__inner">
          <div className="dp-panel__head"><div className="dp-panel__icon-wrap"><domain.icon size={40} strokeWidth={1} /></div><div><span className="dp-panel__num">/{domain.num}</span><h2 className="dp-panel__title">{domain.title}</h2><p className="dp-panel__subtitle">{domain.subtitle}</p></div></div>
          <p className="dp-panel__desc">{domain.description}</p><div className="dp-panel__tags">{domain.tags.map(tag => <span className="dp-panel__tag" key={tag}>{tag}</span>)}</div>
          <div className="dp-panel__actions"><button className="button primary" onClick={domain.onClick}>Explore domain <ArrowUpRight size={15} /></button>
            {domain.whatsappUrl && <a className="button outline" href={domain.whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={16} />Join WhatsApp Community</a>}
          </div>
        </div>
      </div>)}
    </div>
  </section>;
}
