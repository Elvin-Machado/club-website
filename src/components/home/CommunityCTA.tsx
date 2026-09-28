import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const split = (text: string) => text.split(' ').map((word, index) => <span className="cta-word" key={index}>{word.split('').map((char, i) => <span className="cta-letter" key={i}>{char}</span>)}<span>&nbsp;</span></span>);

export default function CommunityCTA({ isOpen }: { isOpen: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import('../../lib/scroll-motion').then(({ gsap }) => {
      if (disposed) return;
      const media = gsap.matchMedia();
      cleanup = () => media.revert();
      media.add({ motion: '(prefers-reduced-motion: no-preference)', compact: '(max-width: 760px)' }, context => {
      if (!context.conditions?.motion) return;
      const section = ref.current!;
      const compact = context.conditions.compact;
      gsap.fromTo(section.querySelectorAll('.cta-letter'), { opacity: .1, filter: `blur(${compact ? 4 : 7}px)`, y: compact ? 12 : 22 }, { opacity: 1, filter: 'blur(0px)', y: 0, stagger: { amount: 1 }, ease: 'power3.out', scrollTrigger: { trigger: section, start: 'top 70%', end: 'center 55%', scrub: .65 } });
      gsap.from(section.querySelector('.eyebrow'), { opacity: 0, y: 16, duration: .65, ease: 'power3.out', scrollTrigger: { trigger: section.querySelector('.eyebrow'), start: 'top 92%', once: true } });
      gsap.from(section.querySelector('p'), { opacity: 0, y: compact ? 16 : 24, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: section.querySelector('p'), start: 'top 92%', once: true } });
      gsap.from(section.querySelectorAll('.community-actions .button'), { opacity: 0, y: compact ? 16 : 24, scale: .93, stagger: .09, duration: .7, ease: 'back.out(1.4)', scrollTrigger: { trigger: section.querySelector('.community-actions'), start: 'top 92%', once: true } });
      }, ref);
    });
    return () => { disposed = true; cleanup?.(); };
  }, []);
  return <section ref={ref} className="community-section community-section--reveal">
    <span className="eyebrow">JOIN THE COMMUNITY</span>
    <h2 aria-label="Learn. Build. Collaborate."><span aria-hidden="true">{split('LEARN. BUILD.')}</span><span aria-hidden="true">{split('COLLABORATE.')}</span></h2>
    <p>{isOpen ? "Applications are open. We're looking for passionate students who are ready to grow, ship, and lead." : "Applications are currently closed. Check out our latest projects and events to see what we're building."}</p>
    <div className="community-actions"><Link to="/recruitment" className="button primary">JOIN CLUB <ArrowUpRight size={16} /></Link><Link to="/projects" className="button outline">PROJECTS</Link></div>
  </section>;
}
