'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Search, X } from 'lucide-react';
import MemberPhoto from './MemberPhoto';
import { filterRoster, groupRoster } from './roster';
import type { ClubMember } from './types';

function MemberRow({ member, open, onToggle }: { member: ClubMember; open: boolean; onToggle: () => void }) {
  const [hovered, setHovered] = useState(false);
  const content = <><span className="roster-name">{member.name}<span className="roster-portrait" data-visible={open || hovered} aria-hidden={!open && !hovered}>{(open || hovered) && <MemberPhoto src={member.image} name={member.name} sizes="48px" />}</span></span><span className="roster-role">{member.role}</span><ArrowUpRight className="roster-row-arrow" size={16} /></>;
  return member.image ? <button className="roster-row" onClick={onToggle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)} aria-pressed={open} aria-label={`${member.name}, ${member.role}. ${open ? 'Hide' : 'Reveal'} portrait`}>{content}</button> : <div className="roster-row">{content}</div>;
}

export default function RosterSection({ members, reducedMotion }: { members: ClubMember[]; reducedMotion: boolean }) {
  const [query, setQuery] = useState('');
  const [activeTeam, setActiveTeam] = useState('All');
  const [revealed, setRevealed] = useState<string | null>(null);
  const teams = useMemo(() => [...new Set(members.map(member => member.team))], [members]);
  const filtered = useMemo(() => filterRoster(members, query).filter(member => activeTeam === 'All' || member.team === activeTeam), [members, query, activeTeam]);
  const groups = useMemo(() => groupRoster(filtered), [filtered]);
  return <section id="members" className="roster-section team-section" aria-labelledby="roster-heading">
    <div className="team-section-top"><span className="team-kicker"><span className="team-section-index">02</span> THE ROSTER</span><span className="team-kicker text-zinc-500">EVERY MIND MATTERS</span></div>
    <div className="team-section-heading"><h2 id="roster-heading">The rest of<br /><span>our universe.</span></h2><p>Different skills. Shared curiosity.<br />The people who turn a community into a force.</p></div>
    <div className="roster-toolbar">
      <div className="roster-search"><Search size={18} aria-hidden="true" /><label className="team-sr-only" htmlFor="roster-search">Search members by name, team, or role</label><input id="roster-search" type="search" autoComplete="off" placeholder="Find a person or a team…" value={query} onChange={event => { setQuery(event.target.value); setRevealed(null); }} />{query && <button aria-label="Clear search" className="roster-clear" onClick={() => setQuery('')}><X size={16} /></button>}<span className="roster-result-count" role="status" aria-live="polite">{String(filtered.length).padStart(2, '0')} <span>MEMBERS</span></span></div>
      <div className="roster-filters" role="group" aria-label="Filter by team">{['All', ...teams].map(team => <button key={team} onClick={() => { setActiveTeam(team); setRevealed(null); }} aria-pressed={activeTeam === team}>{team === 'All' ? 'All teams' : team}</button>)}</div>
    </div>
    <div className="roster-groups">{groups.map(([team, people]) => <motion.section key={team} className="roster-group" aria-label={`${team} team`} initial={reducedMotion ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: reducedMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}>
      <div className="roster-group-label"><span className="roster-team-marker" /><h3>{team}</h3><span>{String(people.length).padStart(2, '0')}</span></div>
      <div className="roster-group-members">{people.map(member => <MemberRow key={member.id} member={member} open={revealed === member.id} onToggle={() => setRevealed(revealed === member.id ? null : member.id)} />)}</div>
    </motion.section>)}</div>
    {!filtered.length && <div className="roster-empty"><Search size={26} strokeWidth={1} /><h3>No minds found this time.</h3><p>Try another name or explore a different team.</p><button onClick={() => { setQuery(''); setActiveTeam('All'); }}>Show everyone <ArrowUpRight size={15} /></button></div>}
    <div className="roster-end"><span className="team-kicker">{String(members.length).padStart(2, '0')} INDIVIDUALS. ENDLESS POSSIBILITIES.</span><span aria-hidden="true">✳</span></div>
  </section>;
}
