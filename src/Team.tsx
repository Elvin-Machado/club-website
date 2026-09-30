import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, List, MoveDown, Sparkles, Users } from 'lucide-react';
import type { Member } from './types';
import { memberIntroduction, organiseTeam } from './lib/team';
import Modal from './components/Modal';
import TeamOrbit from './components/TeamOrbit';
import './team.css';

const number = (value: number) => String(value).padStart(2, '0');

function CoreTeam({ team }: { team: Member[] }) {
  const { core } = useMemo(() => organiseTeam(team), [team]);
  const track = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const jump = useRef<((index: number) => void) | null>(null);
  const [active, setActive] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const [scrollMode, setScrollMode] = useState(true);

  useEffect(() => {
    if (!scrollMode) return;
    let disposed = false;
    let revert: (() => void) | undefined;
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference) and (min-height: 700px)', () => {
        const element = track.current!;
        const cards = [...element.querySelectorAll<HTMLElement>('.core-card')];
        element.classList.add('is-enhanced');
        setEnhanced(true);
        gsap.set(cards, { autoAlpha: 0, y: 55, scale: 0.98 });
        gsap.set(cards[0], { autoAlpha: 1, y: 0, scale: 1 });
        const timeline = gsap.timeline({ defaults: { ease: 'power2.inOut' }, scrollTrigger: {
          trigger: element,
          start: 'top 24px',
          end: 'bottom bottom',
          scrub: 0.65,
          invalidateOnRefresh: true,
        } });
        // Each role holds still for reading before the next card takes its place.
        cards.slice(1).forEach((card, index) => {
          timeline.to(cards[index], { autoAlpha: 0, y: -45, scale: 0.98, duration: 0.28 }, index + 0.64)
            .to(card, { autoAlpha: 1, y: 0, scale: 1, duration: 0.36 }, index + 0.64);
        });
        const marker = { value: 0 };
        timeline.to(marker, { value: 1, duration: 0.6 }, core.length - 1);
        timeline.eventCallback('onUpdate', () => {
          const index = Math.min(core.length - 1, Math.floor(timeline.time() + 0.18));
          setActive(previous => previous === index ? previous : index);
          if (progress.current) progress.current.style.transform = `scaleX(${timeline.progress()})`;
        });
        jump.current = index => {
          const trigger = timeline.scrollTrigger!;
          const fraction = index / timeline.duration();
          window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * fraction, behavior: 'smooth' });
        };
        ScrollTrigger.refresh();
        return () => {
          element.classList.remove('is-enhanced');
          jump.current = null;
          setEnhanced(false);
          if (progress.current) progress.current.style.transform = '';
        };
      });
      revert = () => media.revert();
    }).catch(() => { /* Every role remains readable in the standard layout. */ });
    return () => { disposed = true; revert?.(); };
  }, [core, scrollMode]);

  useEffect(() => {
    if (!enhanced) return;
    const navigation = track.current?.querySelector('.core-directory nav');
    const button = navigation?.children[active] as HTMLElement | undefined;
    if (navigation && button && navigation.scrollWidth > navigation.clientWidth) {
      const left = button.getBoundingClientRect().left - navigation.getBoundingClientRect().left;
      navigation.scrollTo({ left: navigation.scrollLeft + left - 12, behavior: 'smooth' });
    }
  }, [active, enhanced]);

  function goTo(index: number) {
    if (jump.current) jump.current(index);
    else document.getElementById(`core-${core[index].id}`)?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  return <section className="core-section section-wrap" id="core-team" aria-labelledby="core-heading">
    <div className="section-heading"><span className="eyebrow"><span className="section-number">01</span> THE CORE TEAM</span><span className="section-side-note">A SHARED VISION.<br />MANY WAYS TO LEAD.</span></div>
    <div className="split-heading"><h2 id="core-heading">The people who<br /><em>set things in motion.</em></h2><div className="core-heading-detail"><p>Meet the team behind the direction, the details, and everything in between.</p><button className="text-link core-mode-toggle" onClick={() => setScrollMode(value => !value)} aria-pressed={!scrollMode}><List size={15} aria-hidden="true" />{scrollMode ? 'Read as a list' : 'Explore with scroll'}</button></div></div>
    <div className="core-track" ref={track} style={{ '--core-steps': core.length - 1 } as CSSProperties}>
      <div className="core-stage">
        <aside className="core-directory" aria-label="Core team roles">
          <span className="eyebrow">THE CORE / {number(core.length)}</span>
          <nav aria-label="Jump to a core role">{core.map((role, index) => <button key={role.id} onClick={() => goTo(index)} aria-current={enhanced && active === index ? 'step' : undefined}><span>{number(index + 1)}</span>{role.title}<ChevronRight size={13} aria-hidden="true" /></button>)}</nav>
          <a className="text-link" href="#members">Meet the members <ArrowDown size={14} aria-hidden="true" /></a>
        </aside>
        <div className="core-cards">{core.map((role, index) => <article className="core-card" id={`core-${role.id}`} key={role.id} aria-labelledby={`role-${role.id}`} aria-hidden={enhanced && active !== index ? true : undefined} inert={enhanced && active !== index ? true : undefined}>
          <div className="core-card-top"><span className="eyebrow"><span className="status-dot" aria-hidden="true" /> NUCLEUS / CORE TEAM</span><span>{number(index + 1)} <span>/ {number(core.length)}</span></span></div>
          <div className="core-card-body">
            <div className="core-copy"><p className="core-role" id={`role-${role.id}`}>{role.title}</p><h3>{role.people.length ? role.people.map(person => person.name).join(' & ') : 'To be announced'}</h3><p className="core-headline">{role.headline.split('\n').map((line, i) => <span key={i}>{line}</span>)}</p>
              <div className="core-intro">{role.people.length ? role.people.map(person => <p key={person.id}>{person.bio?.trim() || `${person.name} ${role.intro.charAt(0).toLowerCase()}${role.intro.slice(1)}`}</p>) : <p>{role.intro} Meet the person behind this role soon.</p>}</div>
              <div className="core-focus">{role.focus.map(focus => <span key={focus}>{focus}</span>)}</div>
            </div>
            <div className={`core-portrait portrait-${index % 3}`} aria-hidden="true"><span className="portrait-index">N / {number(index + 1)}</span><div className="portrait-orbits"><i /><i /><i /></div>{role.people.some(person => person.image) ? <img src={role.people.find(person => person.image)?.image} alt="" className="member-photo" /> : <span className="portrait-initials">{role.people.length ? role.people.map(person => person.initials).join(' · ') : '✳'}</span>}<span className="portrait-caption">{role.people.length ? 'ONE OF MANY MINDS.' : 'THE NEXT CONNECTION.'}</span><Sparkles className="portrait-spark" size={22} strokeWidth={1} /></div>
          </div>
          <div className="core-card-bottom"><span>INDIVIDUALLY CURIOUS. COLLECTIVELY NUCLEUS.</span><span aria-hidden="true">✳</span></div>
        </article>)}</div>
        <div className="core-playback" hidden={!enhanced}><span className="core-scroll-hint"><MoveDown size={14} aria-hidden="true" /> SCROLL TO MEET THE NEXT MIND</span><div className="core-progress" aria-hidden="true"><span ref={progress} /></div><span className="core-position">{number(active + 1)} / {number(core.length)}</span><button className="icon-button" aria-label="Previous core role" disabled={active === 0} onClick={() => goTo(active - 1)}><ChevronLeft size={16} aria-hidden="true" /></button><button className="icon-button" aria-label="Next core role" disabled={active === core.length - 1} onClick={() => goTo(active + 1)}><ChevronRight size={16} aria-hidden="true" /></button></div>
      </div>
    </div>
  </section>;
}

export default function TeamPage({ team, onJoin }: { team: Member[]; onJoin: () => void }) {
  const { core, members } = useMemo(() => organiseTeam(team), [team]);
  const [selected, setSelected] = useState<Member | null>(null);

  return <div className="team-page">
    <section className="team-hero section-wrap" aria-labelledby="team-title">
      <div className="hero-grid" aria-hidden="true" />
      <div className="team-hero-copy"><a className="team-breadcrumb" href="/">NUCLEUS <span>/</span> THE TEAM</a><span className="eyebrow"><span className="status-dot" /> DIFFERENT MINDS. SHARED AMBITION.</span><h1 id="team-title">The minds<br />behind <em>the spark.</em></h1><p>Ideas bring us together.<br />The people make us <strong>Nucleus.</strong></p><p className="team-hero-intro">We’re a community of curious students at SJEC, learning by doing and building together. Meet the people who give our club its direction, its energy, and its sense of belonging.</p><div className="team-hero-actions"><a className="button primary" href="#core-team">Meet the core team <ArrowDown size={17} /></a><a className="text-link" href="#members">Our members <ArrowUpRight size={16} /></a></div></div>
      <TeamOrbit />
      <div className="team-hero-bottom"><span><strong>{number(core.length)}</strong> CORE ROLES</span><span><strong>{number(team.length)}</strong> CONNECTED MINDS</span><span><strong>01</strong> SHARED PURPOSE</span><a href="#core-team"><ArrowDown size={14} /> GET TO KNOW US</a></div>
    </section>
    <div className="manifesto-strip team-manifesto" aria-label="Team values"><span>LEAD WITH CURIOSITY</span><span className="strip-star">✳</span><span>GROW TOGETHER</span><span className="strip-star">✳</span><span>MAKE IT MATTER</span><span className="strip-star">✳</span></div>
    <CoreTeam team={team} />
    <section className="members-section section-wrap" id="members" aria-labelledby="members-heading">
      <div className="section-heading"><span className="eyebrow"><span className="section-number">02</span> OUR MEMBERS</span><span className="section-side-note">THE COMMUNITY<br />IS THE CONNECTION.</span></div>
      <div className="split-heading"><h2 id="members-heading">More minds.<br /><em>More possibilities.</em></h2><p>Every member brings a new perspective.<br />Choose a card to get to know the people who make this community our own.</p></div>
      {members.length ? <ul className="community-grid">{members.map((member, index) => <li key={member.id}><button className="community-card" onClick={() => setSelected(member)} aria-label={`Meet ${member.name}, ${member.role}`} aria-haspopup="dialog"><span className="community-card-top"><span className="eyebrow">NUCLEUS / PEOPLE</span><span>{number(index + 1)}</span></span><span className={`community-avatar portrait-${index % 3}`} aria-hidden="true">{member.image ? <img src={member.image} alt={`Portrait of ${member.name}`} className="member-photo" /> : <>{member.initials}<i>✳</i></>}</span><span className="community-name">{member.name}</span><span className="community-role">{member.role}</span><span className="community-card-link">A little about me <ArrowUpRight size={18} aria-hidden="true" /></span></button></li>)}</ul> : <div className="members-empty"><Users size={28} strokeWidth={1} aria-hidden="true" /><h3>Our next connections are on their way.</h3><p>Meet more members here as the community grows.</p></div>}
      <div className="team-invitation"><div><span className="eyebrow"><Sparkles size={15} /> THERE’S A PLACE FOR YOUR PERSPECTIVE.</span><h3>The next connection<br />could be <em>you.</em></h3></div><button className="button outline" onClick={onJoin}>Connect with Nucleus <ArrowRight size={17} /></button></div>
    </section>
    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}><div className="member-profile"><span className="profile-role"><span className="status-dot" />{selected.role} · Nucleus SJEC</span><div className="profile-avatar" aria-hidden="true">{selected.image ? <img src={selected.image} alt="" className="member-photo" /> : <>{selected.initials}<span>✳</span></>}</div><p className="modal-lead">{memberIntroduction(selected)}</p><span className="eyebrow profile-signoff">MANY MINDS. ONE NUCLEUS.</span><button className="button outline" onClick={() => setSelected(null)}>Back to the people <ArrowRight size={16} /></button></div></Modal>}
  </div>;
}
