import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import './domain-parallax.css';

gsap.registerPlugin(ScrollTrigger);

export type DomainItem = {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  description: string;
  tags: readonly string[];
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  onClick: () => void;
  whatsappUrl?: string;
};

interface DomainParallaxProps {
  domains: DomainItem[];
}

export default function DomainParallax({ domains }: DomainParallaxProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRefs   = useRef<(HTMLElement | null)[]>([]);
  const panelRefs  = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const overlay = overlayRef.current;
    if (!section || !overlay) return;

    const cards  = cardRefs.current.filter(Boolean) as HTMLElement[];
    const panels = panelRefs.current.filter(Boolean) as HTMLElement[];
    if (cards.length < 3 || panels.length < 3) return;

    // Initial states
    gsap.set(cards,   { y: 90, opacity: 0, scale: 1, filter: 'blur(0px)' });
    gsap.set(panels,  { opacity: 0, y: 70, scale: 0.93 });
    gsap.set(overlay, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.8,
      },
    });

    // Phase 1: All 3 cards fly up
    tl.to(cards[0], { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out' })
      .to(cards[1], { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out' }, '-=0.45')
      .to(cards[2], { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out' }, '-=0.45')
      .to({}, { duration: 0.6 });

    // Phase 2: Cards 2 & 3 to glassmorphism, overlay fades in
    tl.to([cards[1], cards[2]], { opacity: 0.2, scale: 0.9, filter: 'blur(4px)', duration: 0.6 })
      .to(overlay, { opacity: 1, duration: 0.5 }, '<0.15');

    // Phase 3: Panel 1 rises
    tl.to(panels[0], { opacity: 1, y: 0, scale: 1, duration: 0.75 });
    tl.to({}, { duration: 1.4 });

    // Phase 4: Panel 1 exits, Card 1 goes to glassmorphism
    tl.to(panels[0], { opacity: 0, y: -80, scale: 1.05, duration: 0.55 });
    tl.to(overlay,   { opacity: 0, duration: 0.4 }, '<');
    tl.to(cards[0],  { opacity: 0.2, scale: 0.9, filter: 'blur(4px)', duration: 0.55 }, '<');

    // Phase 5: Card 2 comes into focus
    tl.to(cards[1], { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.55, ease: 'expo.out' });
    tl.to(overlay,  { opacity: 1, duration: 0.4 }, '<0.1');
    tl.to({}, { duration: 0.2 });

    // Phase 6: Panel 2 rises
    tl.to(panels[1], { opacity: 1, y: 0, scale: 1, duration: 0.75 });
    tl.to({}, { duration: 1.4 });

    // Phase 7: Panel 2 exits, Card 2 goes to glassmorphism
    tl.to(panels[1], { opacity: 0, y: -80, scale: 1.05, duration: 0.55 });
    tl.to(overlay,   { opacity: 0, duration: 0.4 }, '<');
    tl.to(cards[1],  { opacity: 0.2, scale: 0.9, filter: 'blur(4px)', duration: 0.55 }, '<');

    // Phase 8: Card 3 comes into focus
    tl.to(cards[2], { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.55, ease: 'expo.out' });
    tl.to(overlay,  { opacity: 1, duration: 0.4 }, '<0.1');
    tl.to({}, { duration: 0.2 });

    // Phase 9: Panel 3 rises
    tl.to(panels[2], { opacity: 1, y: 0, scale: 1, duration: 0.75 });
    tl.to({}, { duration: 1.4 });

    // Phase 10: Panel 3 & overlay exit, and all 3 cards come back to focus
    tl.to(panels[2], { opacity: 0, y: -80, scale: 1.05, duration: 0.55 });
    tl.to(overlay,   { opacity: 0, duration: 0.4 }, '<');
    tl.to(cards, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.6 }, '<0.2');

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="dp-section" ref={sectionRef}>
      <div className="dp-sticky">

        {/* Header */}
        <div className="dp-header">
          <p className="dp-eyebrow">Our Domains</p>
          <h2 className="dp-title">
            Three paths.<br />
            <span>Infinite directions.</span>
          </h2>
        </div>

        {/* Cards row � all 3 always present */}
        <div className="dp-cards-row">
          {domains.map((d, i) => (
            <button
              key={d.id}
              ref={(el) => { cardRefs.current[i] = el; }}
              className="dp-card"
              onClick={d.onClick}
              aria-label={`${d.title} ${d.subtitle}`}
            >
              <div className="dp-card__icon-row">
                <d.icon size={28} strokeWidth={1.2} color="#6ba4ab" />
                <span className="dp-card__num">/{d.num}</span>
              </div>
              <div>
                <h3 className="dp-card__title">{d.title}</h3>
                <p className="dp-card__subtitle">{d.subtitle}</p>
              </div>
              <p className="dp-card__desc">{d.description}</p>
              <div className="dp-card__tags">
                {d.tags.map((tag) => (
                  <span key={tag} className="dp-card__tag">{tag}</span>
                ))}
              </div>
              <span className="dp-card__cta">
                Find your spark <ArrowUpRight size={13} />
              </span>
            </button>
          ))}
        </div>

        {/* Dark scrim */}
        <div className="dp-overlay" ref={overlayRef} aria-hidden="true" />

        {/* Detail panels � one per domain, all absolutely centered */}
        {domains.map((item, i) => (
          <div
            key={item.id}
            ref={(el) => { panelRefs.current[i] = el; }}
            className="dp-panel"
            role="region"
            aria-label={`${item.title} detail`}
          >
            <div className="dp-panel__inner">
              <div className="dp-panel__head">
                <div className="dp-panel__icon-wrap">
                  <item.icon size={40} strokeWidth={1} color="#6ba4ab" />
                </div>
                <div>
                  <span className="dp-panel__num">/{item.num}</span>
                  <h2 className="dp-panel__title">{item.title}</h2>
                  <p className="dp-panel__subtitle">{item.subtitle}</p>
                </div>
              </div>

              <p className="dp-panel__desc">{item.description}</p>

              <div className="dp-panel__tags">
                {item.tags.map((tag) => (
                  <span key={tag} className="dp-panel__tag">{tag}</span>
                ))}
              </div>

              <div className="dp-panel__actions">
                <button className="dp-panel__btn-explore" onClick={item.onClick}>
                  Explore domain <ArrowUpRight size={15} />
                </button>

                {i === 0 && (
                  <a
                    className="dp-panel__btn-whatsapp"
                    href={item.whatsappUrl ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={16} />
                    Join WhatsApp Community
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
