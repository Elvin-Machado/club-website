import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Member } from '../types';
import { Reveal } from '../components/ui/reveal';
import './showcase.css';

export default function PeoplePage({ members }: { members: Member[] }) {
  return <section className="showcase-page section-wrap" aria-labelledby="people-title">
    <Reveal stagger={90}><div className="page-eyebrow" data-reveal-item><span className="eyebrow">02 / The people</span><span className="eyebrow">Nucleus · SJEC</span></div>
      <div className="page-heading"><h1 id="people-title" data-reveal-item>Many minds.<br /><em>One nucleus.</em></h1><p data-reveal-item>The people who make<br /> the connections happen.</p></div>
    </Reveal>
    <div className="people-grid">{members.map((member, index) => <Reveal key={member.id} className={index < 3 ? 'person-featured' : ''} variant="pop" delay={(index % 3) * 75}>
      <article className="person-card" aria-labelledby={`person-${member.id}`}>
        <div className={`person-art person-art--${index % 3}`} aria-hidden="true">
          <span className="person-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="person-orbit" /><span className="person-orbit person-orbit--second" />
          <span className="person-initials">{member.initials}</span>
          <span className="person-spark">✳</span>
        </div>
        <div className="person-copy"><h2 id={`person-${member.id}`}>{member.name}</h2><p>{member.role}</p></div>
      </article>
    </Reveal>)}</div>
    {!members.length && <div className="empty-state">The team will be announced here soon.</div>}
    <Reveal><Link className="next-page" to="/recruitment"><span><span className="eyebrow">Make a connection</span><strong>Find your place.</strong></span><ArrowUpRight size={32} strokeWidth={1.2} /></Link></Reveal>
    <Link className="text-link people-work-link" to="/projects">See what we build <ArrowRight size={16} /></Link>
  </section>;
}
