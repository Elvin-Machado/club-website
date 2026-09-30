import { useEffect, useRef } from 'react';
import { Reveal } from '../ui/reveal';
import { TextReveal } from '../ui/text-reveal';
import './voices-marquee.css';

const reviews = [
  {
    name: "Ken Masters",
    username: "@kmasters",
    body: "“Our productivity has nearly doubled since onboarding. Automation features removed repetitive tasks, allowing our team to focus on building instead of managing operations.”",
    profile: "https://cdn.21st.dev/assets/mirror/b5/b539abc60701ab9cbcd73f9241d13a14a09582a4fd06c65784cb5567d77a2e0e.webp",
  },
  {
    name: "Kira Athrun",
    username: "@kathrun",
    body: "“What surprised us most was how quickly our team adapted. Minimal learning curve, excellent documentation, and powerful features make it a must-have for modern SaaS companies.”",
    profile: "https://cdn.21st.dev/assets/mirror/2b/2bc5f22fa3400c61a2161d14e3dce5a0804badebfc1b3d9cbe844feaa3b72180.webp",
  },
  {
    name: "Lirael Nassun",
    username: "@lnassun",
    body: "“This is easily one of the most reliable SaaS tools we’ve adopted. The UI is intuitive, integrations are seamless, and it saves us countless hours every week.”",
    profile: "https://cdn.21st.dev/assets/mirror/e1/e1e172821860559f890ef5ef7c14cc66a6c1ec001f3bbeb6dddd349c0081dd6b.webp",
  },
  {
    name: "Jessica",
    username: "@jessica",
    body: "“Switching to this platform streamlined our entire workflow. Setup was effortless, performance improved instantly, and our team now ships features faster without worrying about infrastructure.”",
    profile: "https://cdn.21st.dev/assets/mirror/61/61fda783ca2662349458bad61a434038016f05d6a14bd7c5a314f48c8ee8be03.webp",
  },
  {
    name: "Jenny",
    username: "@jenny",
    body: "“We evaluated multiple solutions, but this stood out immediately. It’s fast, scalable, and thoughtfully designed for growing teams that need stability without added complexity.”",
    profile: "https://cdn.21st.dev/assets/mirror/c5/c5ee2e124ea7334450d30a46607f793534f567e97d4b708cda110a06aeed4953.webp",
  },
];

const firstRow = reviews; // Reusing all reviews to have enough cards
const secondRow = [...reviews].reverse(); // A bit of variety for the second row

const ReviewCard = ({ profile, name, username, body }: { profile: string; name: string; username: string; body: string }) => {
  return (
    <div className="vm-card">
      <div className="vm-card-header">
        <img className="vm-avatar" alt="" src={profile} width={40} height={40} loading="lazy" decoding="async" />
        <div className="vm-meta">
          <p className="vm-name">{name}</p>
          <p className="vm-username">{username}</p>
        </div>
      </div>
      <p className="vm-body">{body}</p>
    </div>
  );
};

export default function VoicesMarquee() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = ref.current!;
    const rows = section.querySelectorAll<HTMLElement>('.vm-marquee-wrapper');
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const visible = new Set<Element>();
    const sync = () => rows.forEach(row => {
      row.dataset.running = String(visible.has(row) && !document.hidden && !media.matches);
    });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      sync();
    });
    rows.forEach(row => observer.observe(row));
    sync();
    document.addEventListener('visibilitychange', sync);
    media.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      media.removeEventListener('change', sync);
    };
  }, []);
  return (
    <section ref={ref} className="vm-container section-space">
      <div className="vm-header">
        <TextReveal as="h2" className="vm-title" text="THE VOICES OF NUCLEUS" />
      </div>

      <Reveal className="vm-marquee-wrapper" delay={70}>
        <div className="vm-marquee-content">
          {firstRow.map((review, i) => <ReviewCard key={`f1-${i}`} {...review} />)}
        </div>
        {/* Duplicate for infinite loop */}
        <div className="vm-marquee-content" aria-hidden="true">
          {firstRow.map((review, i) => <ReviewCard key={`f2-${i}`} {...review} />)}
        </div>
        <div className="vm-fade-left"></div>
        <div className="vm-fade-right"></div>
      </Reveal>

      <Reveal className="vm-marquee-wrapper reverse" delay={140}>
        <div className="vm-marquee-content">
          {secondRow.map((review, i) => <ReviewCard key={`s1-${i}`} {...review} />)}
        </div>
        {/* Duplicate for infinite loop */}
        <div className="vm-marquee-content" aria-hidden="true">
          {secondRow.map((review, i) => <ReviewCard key={`s2-${i}`} {...review} />)}
        </div>
        <div className="vm-fade-left"></div>
        <div className="vm-fade-right"></div>
      </Reveal>
    </section>
  );
}
