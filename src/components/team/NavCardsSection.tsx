'use client';

import { TeamLink as Link, useTeamNavigation } from './TeamNavigation';
import { motion } from 'framer-motion';
import { UsersRound, GraduationCap, ArrowUpRight, ArrowUp } from 'lucide-react';

const cards = [
  { id: 'members', title: 'MEMBERS', description: 'Meet the current NUCLEUS community.', cta: 'Explore current members', href: '/members', icon: UsersRound },
  { id: 'alumni', title: 'ALUMNI', description: 'Discover the people who shaped NUCLEUS.', cta: 'Explore our alumni', href: '/alumni', icon: GraduationCap },
];

export default function NavCardsSection({ reducedMotion }: { reducedMotion: boolean }) {
  const router = useTeamNavigation();

  return <section className="nav-cards-section" id="navigation-cards" aria-labelledby="nav-cards-heading">
    <div className="core-deck-nav-header">
      <span className="team-kicker"><span className="team-signal" />EXPLORE THE COMMUNITY</span>
      <h2 id="nav-cards-heading" className="core-deck-nav-title">More minds. More possibilities.</h2>
    </div>
    <ul className="nav-cards-grid">
      {cards.map(card => {
        const Icon = card.icon;
        return <motion.li key={card.id} className="nav-card-motion"
          whileHover={reducedMotion ? undefined : { y: -4 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}>
          <Link href={card.href} className={`nav-card nav-card-${card.id}`}
            aria-label={`${card.title} — ${card.description}. ${card.cta}`}
            onMouseEnter={() => router.prefetch(card.href)} onFocus={() => router.prefetch(card.href)}
            onNavigate={() => {
              // Save only this history entry, preserving the router's own state.
              window.history.replaceState({ ...window.history.state, peopleScrollY: window.scrollY }, '');
            }}>
            <span className="nav-card-glow" aria-hidden="true" />
            <span className="nav-card-header"><span className="nav-card-icon-wrap"><Icon size={30} strokeWidth={1.4} aria-hidden="true" /></span><ArrowUpRight className="nav-card-arrow" size={25} strokeWidth={1.3} aria-hidden="true" /></span>
            <span className="nav-card-content"><span className="nav-card-title">{card.title}</span><span className="nav-card-description">{card.description}</span></span>
            <span className="nav-card-footer"><span className="nav-card-cta">{card.cta}</span><ArrowUpRight size={16} aria-hidden="true" /></span>
          </Link>
        </motion.li>;
      })}
    </ul>
    <p className="nav-cards-scroll-hint"><ArrowUp size={14} aria-hidden="true" /> Scroll up to revisit the core team</p>
  </section>;
}
