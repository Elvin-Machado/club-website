'use client';

import { useEffect, useRef, useState } from 'react';
import { TeamLink as Link, useTeamNavigation } from './TeamNavigation';
import { motion } from 'framer-motion';
import { UsersRound, GraduationCap, ArrowUpRight } from 'lucide-react';

const cards = [
  { id: 'members', title: 'MEMBERS', description: 'Meet the current NUCLEUS community.', cta: 'Explore current members', href: '/members', icon: UsersRound },
  { id: 'alumni', title: 'ALUMNI', description: 'Discover the people who shaped NUCLEUS.', cta: 'Explore our alumni', href: '/alumni', icon: GraduationCap },
];

export default function NavCardsSection({ reducedMotion }: { reducedMotion: boolean }) {
  const router = useTeamNavigation();
  const { pathname } = router;
  const [expandingCard, setExpandingCard] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pending.current = null;
    setExpandingCard(null);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [pathname]);

  return <section className="nav-cards-section team-section" id="navigation-cards" aria-labelledby="nav-cards-heading">
    <h2 id="nav-cards-heading" className="team-sr-only">Explore the NUCLEUS community</h2>
    <div className="nav-cards-grid">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const expanding = expandingCard === card.href;
        return <motion.div key={card.id} className="nav-card-motion"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : index * 0.08, ease: [0.22, 1, 0.36, 1] }}>
          <motion.div className="nav-card-motion"
            animate={{ scale: expanding ? 1.035 : 1, opacity: expanding ? 0.55 : 1 }}
            whileHover={reducedMotion || expanding ? undefined : { y: -4 }}
            transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}>
            <Link href={card.href} className={`nav-card nav-card-${card.id}`}
              aria-label={`${card.title}: ${card.description}`}
              onMouseEnter={() => router.prefetch(card.href)} onFocus={() => router.prefetch(card.href)}
              onKeyDown={event => { if (event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
              onNavigate={event => {
                if (reducedMotion) return;
                event.preventDefault();
                if (pending.current) return;
                pending.current = card.href;
                setExpandingCard(card.href);
                timer.current = setTimeout(() => router.push(card.href), 240);
              }}>
              <span className="nav-card-glow" aria-hidden="true" />
              <span className="nav-card-header"><span className="nav-card-icon-wrap"><Icon size={30} strokeWidth={1.4} aria-hidden="true" /></span><ArrowUpRight className="nav-card-arrow" size={25} strokeWidth={1.3} aria-hidden="true" /></span>
              <div className="nav-card-content"><h3 className="nav-card-title">{card.title}</h3><span className="nav-card-description">{card.description}</span></div>
              <span className="nav-card-footer"><span className="nav-card-cta">{card.cta}</span><ArrowUpRight size={16} aria-hidden="true" /></span>
            </Link>
          </motion.div>
        </motion.div>;
      })}
    </div>
  </section>;
}
