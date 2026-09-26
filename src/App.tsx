import { useEffect, useState, type FormEvent } from 'react';
<<<<<<< HEAD
import { ArrowUpRight, ArrowRight, ArrowDown, Menu, X, BrainCircuit, Code2, Network, Github, Instagram, Linkedin, Mail, Check, Sparkles, LoaderCircle, Plus, Minus, ChevronRight } from 'lucide-react';
import { Intro, Logo } from './components/Logo';
import Modal from './components/Modal';
import { api } from './api';
import type { SiteData, SiteSettings } from './types';
import seed from '../shared/public-data.json';
import EventExplorer from './components/EventExplorer';
import TeamPage from './Team';

const domains = [
  { id: 'aiml', num: '01', title: 'Artificial Intelligence', subtitle: '& Machine Learning', icon: BrainCircuit, tags: ['Intelligence', 'Research', 'Possibility'], description: 'From a first model to the next big question. Explore the systems that learn, adapt, and open up entirely new possibilities.', detail: 'Explore model building, machine learning foundations, research papers, and practical AI applications. Bring your curiosity; build your understanding through collaborative experiments.' },
  { id: 'web', num: '02', title: 'Web Development', subtitle: '& Digital Experiences', icon: Code2, tags: ['Design', 'Build', 'Ship'], description: 'Make something people can actually use. Turn your ideas into thoughtful interfaces and reliable, real-world applications.', detail: 'Work across frontend and backend development, UI design, APIs, and deployment. Learn by making useful applications and sharing feedback with other builders.' },
  { id: 'dsa', num: '03', title: 'Data Structures', subtitle: '& Algorithms', icon: Network, tags: ['Logic', 'Patterns', 'Problem-solving'], description: 'Learn to see the elegant solution. Sharpen your thinking, break down hard problems, and build a stronger foundation.', detail: 'Develop problem-solving habits through data structures, algorithmic thinking, peer practice, and competitive programming. Learn to explain both your solution and why it works.' },
] as const;

function ApplyForm({ settings, online, onClose }: { settings: SiteSettings; online: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [reference, setReference] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try { const result = await api<{ id: string }>('/applications', { method: 'POST', body: JSON.stringify({ ...fields, consent: fields.consent === 'on' }) }); setReference(result.id); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Modal title={reference ? 'You’re in the conversation.' : settings.recruitmentOpen ? 'Your next connection starts here.' : 'Good things are ahead.'} onClose={onClose}>
    {reference ? <div className="success-panel"><span className="success-icon"><Check /></span><p>Your application is saved. The team will review it and contact you using the email you provided.</p><span className="eyebrow">Your application reference</span><code>{reference}</code><p className="muted small">Save this number if you need to follow up.</p><button className="button primary" onClick={onClose}>Back to exploring <ArrowRight size={17} /></button></div>
      : !settings.recruitmentOpen ? <><p className="modal-lead">{settings.recruitmentMessage}</p><p className="muted">You can still explore our domains and projects, or reach out to introduce yourself.</p><a className="button primary" href={settings.instagramUrl} target="_blank" rel="noreferrer">Follow the next chapter <Instagram size={18} /></a><a className="text-link" href={`mailto:${settings.contactEmail}`}>Contact the team <ArrowUpRight size={16} /></a></>
      : <><p className="modal-lead">Curiosity matters more than knowing everything. Tell us a little about yourself.</p><form onSubmit={submit} className="application-form">
        <div className="form-grid"><label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Full name" /></label><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label></div>
        <div className="form-grid"><label>Year of study<select name="year" required defaultValue=""><option value="" disabled>Select year</option>{[1, 2, 3, 4].map(year => <option key={year} value={year}>Year {year}</option>)}</select></label><label>Your domain<select name="domain" required defaultValue=""><option value="" disabled>What interests you?</option><option value="aiml">AI & Machine Learning</option><option value="web">Web Development</option><option value="dsa">Data Structures & Algorithms</option></select></label></div>
        <label>What would you like to learn or build?<textarea name="motivation" rows={4} minLength={30} maxLength={1600} required placeholder="Tell us what makes you curious. No perfect answers needed. (30+ characters)" /></label>
        <label>Portfolio or GitHub <span className="muted">(optional)</span><input name="portfolio" type="url" placeholder="https://" maxLength={500} /></label>
        <label className="honeypot" aria-hidden="true">Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label className="checkbox-label"><input type="checkbox" name="consent" required /><span>I agree that the Nucleus team may use these details to review my application and contact me about recruitment.</span></label>
        <p className="small muted">Only the club’s administrators can access applications. To request correction or deletion, email {settings.contactEmail}.</p>
        {error && <p className="form-error" role="alert">{error}</p>}{!online && <p className="form-error">Applications are temporarily unavailable. Please reconnect and try again.</p>}
        <button className="button primary full-width" disabled={busy || !online}>{busy ? <><LoaderCircle className="spin" size={18} /> Sending application…</> : <>Make the connection <ArrowUpRight size={18} /></>}</button>
      </form></>}
  </Modal>;
}

export default function App({ initialData = seed, pathname = '/' }: { initialData?: SiteData; pathname?: string }) {
  const isTeamPage = /^\/team\/?$/.test(pathname);
  const homeLink = (hash: string) => isTeamPage ? `/${hash}` : hash;
  const [data, setData] = useState<SiteData>(initialData), [online, setOnline] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false), [applyOpen, setApplyOpen] = useState(false);
  const [domain, setDomain] = useState<number | null>(null), [faq, setFaq] = useState<number | null>(0);
  useEffect(() => {
    if (!isTeamPage) return;
    document.title = 'The team | Nucleus SJEC';
    const description = 'Meet the core team and members of Nucleus, the student innovation community at St. Joseph Engineering College, Mangaluru.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://nucleussjec.in/team');
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', 'https://nucleussjec.in/team');
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) document.querySelector(selector)?.setAttribute('content', 'The team | Nucleus SJEC');
    for (const selector of ['meta[property="og:description"]', 'meta[name="twitter:description"]']) document.querySelector(selector)?.setAttribute('content', description);
  }, [isTeamPage]);
  useEffect(() => {
    const abort = new AbortController();
    api<SiteData>('/site', { signal: abort.signal }).then(site => { setData(site); setOnline(true); }).catch(error => { if (error.name !== 'AbortError') setOnline(false); });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, []);
  const settings = data.settings;
  const faqs = [
    ['Do I need to be an expert to join?', 'No. A willingness to learn and contribute is a great starting point. Pick a domain that makes you curious and tell us what you’d like to explore.'],
    ['What can I work on at Nucleus?', 'Our three core domains are AI & Machine Learning, Web Development, and Data Structures & Algorithms. Explore hands-on projects, sessions, and collaborative learning with the community.'],
    ['When can I apply?', settings.recruitmentOpen ? `Applications are open for our ${settings.cycle} intake. Use the Join Nucleus button to apply.${settings.recruitmentDeadline ? ` The deadline is ${new Date(settings.recruitmentDeadline).toLocaleDateString('en-IN', { dateStyle: 'long' })}.` : ''}` : settings.recruitmentMessage],
    ['How do I get in touch?', `Write to ${settings.contactEmail}, or find Nucleus on Instagram and LinkedIn. We’d love to hear your questions and ideas.`],
  ];
  return <>
    <Intro />
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="site-header"><a className="brand" href={homeLink('#home')} aria-label="Nucleus home"><Logo /><span>NUCLEUS<small>SJEC · MANGALURU</small></span></a>
      <nav className={menuOpen ? 'navigation open' : 'navigation'} aria-label="Main navigation">{[['The idea', homeLink('#about')], ['Experiences', homeLink('#events')], ['Our work', homeLink('#projects')], ['The team', '/team']].map(([label, href]) => <a key={href} href={href} aria-current={isTeamPage && href === '/team' ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>
      <button className="button header-cta" onClick={() => setApplyOpen(true)}>{settings.recruitmentOpen ? 'Join Nucleus' : 'Stay connected'}<ArrowUpRight size={16} /></button>
      <button className="icon-button menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
    </header>
    <main id="main-content">
      {isTeamPage ? <>
        {!online && <div className="connection-banner" role="status">You’re viewing saved club information. Live updates are temporarily unavailable. <button onClick={() => window.location.reload()}>Try again</button></div>}
        <TeamPage team={data.team} onJoin={() => setApplyOpen(true)} />
      </> : <>
      <section className="hero section-wrap" id="home">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy"><div className="eyebrow hero-eyebrow"><span className="status-dot" /> MANY MINDS. ONE NUCLEUS.</div>
          <h1>Curiosity is<br />a <em>powerful</em><br />connection.</h1>
          <p className="hero-description">A place for the what-ifs. The late-night ideas.<br className="desktop-break" /> The people who turn “what if” into “what’s next”.</p>
          <div className="hero-actions"><a className="button primary" href="#events">Explore our universe <ArrowUpRight size={19} /></a><a className="text-link" href="#about">Meet Nucleus <ArrowRight size={17} /></a></div>
          <div className="hero-affiliation"><span className="affiliation-line" /><p>THE STUDENT INNOVATION COMMUNITY<br /><strong>St. Joseph Engineering College, Mangaluru</strong></p></div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="brain-aura" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="brain-crosshair cross-one" /><div className="brain-crosshair cross-two" /><img className="hero-brain" src="/brain-mark.svg" alt="" width="500" height="470" fetchPriority="high" /><span className="art-label label-top">01 / THE ORIGIN OF AN IDEA</span><span className="art-label label-bottom"><i /> CONNECTION ESTABLISHED</span><span className="art-coordinate">12.9101° N<br />74.8981° E</span><span className="floating-note"><Sparkles size={14} /> Built on curiosity.</span></div>
        <div className="hero-bottom"><a href="#about"><ArrowDown size={14} /><span>SCROLL TO CONNECT</span></a><span>LEARN. BUILD. BELONG.</span><span className="hero-index">EST. 2026 <span>↗</span></span></div>
      </section>
      {!online && <div className="connection-banner" role="status">You’re viewing saved club information. Live updates are temporarily unavailable. <button onClick={() => window.location.reload()}>Try again</button></div>}
      <div className="manifesto-strip" aria-label="Our principles"><span>THINK BEYOND</span><span className="strip-star">✳</span><span>BUILD TOGETHER</span><span className="strip-star">✳</span><span>STAY CURIOUS</span><span className="strip-star">✳</span><span>MAKE IT MATTER</span><span className="strip-star">✳</span></div>
      <section className="about section-wrap section-space" id="about"><div className="section-heading"><span className="eyebrow"><span className="section-number">01</span> THE IDEA</span><span className="section-side-note">GOOD THINGS HAPPEN<br />WHEN MINDS MEET.</span></div>
        <div className="about-intro"><h2>Not just a club.<br /><span>A meeting of minds.</span></h2><div><p>Every big idea begins with a small spark. Nucleus brings curious students together to explore technology, learn by doing, and build things that matter.</p><p className="muted">Different interests. Shared ambition. Find your starting point in one of our three core domains.</p></div></div>
        <div className="domain-grid">{domains.map((item, index) => <button className={`domain-card domain-${item.id}`} key={item.id} onClick={() => setDomain(index)}><div className="domain-card-top"><item.icon size={30} strokeWidth={1.2} /><span>/{item.num}</span></div><h3>{item.title}<span>{item.subtitle}</span></h3><p>{item.description}</p><div className="domain-tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div><span className="domain-explore">Find your spark <ArrowUpRight size={19} /></span></button>)}</div>
      </section>
      <section className="events-section section-wrap section-space" id="events"><div className="section-heading"><span className="eyebrow"><span className="section-number">02</span> THE EXPERIENCES</span><span className="section-side-note">A LITTLE EXPLORATION<br />GOES A LONG WAY.</span></div>
        <div className="split-heading"><h2>Take a ride<br />through <em>our minds.</em></h2><p>Every stop, a new connection.<br />Explore our events inside the Nucleus neural network.</p></div>
        <EventExplorer events={data.events} />
      </section>
      <section className="projects-section section-wrap section-space" id="projects"><div className="section-heading"><span className="eyebrow"><span className="section-number">03</span> IDEAS IN THE REAL WORLD</span><a className="text-link" href={settings.githubUrl} target="_blank" rel="noreferrer">Our GitHub <ArrowUpRight size={16} /></a></div>
        <div className="split-heading"><h2>Less someday.<br /><span>More <em>built it.</em></span></h2><p>Real problems. Fresh perspectives.<br />A look at what our community is putting into the world.</p></div>
        <div className="project-grid">{data.projects.map((project, index) => <article className="project-card" key={project.id}><div className="project-visual" aria-hidden="true"><div className="project-visual-grid" /><div className="laundry-graphic"><div className="laundry-top"><span /><i /><i /></div><div className="laundry-drum"><span /><span /><span /></div><div className="laundry-bottom" /></div><span className="project-visual-label">CONCEPT → CODE → CONNECTION</span><span className="project-counter">0{index + 1}</span></div><div className="project-copy"><div className="project-meta"><span>{project.domain}</span><span><i />{project.status}</span></div><h3>{project.title}<ArrowUpRight size={28} strokeWidth={1.2} /></h3><p>{project.description}</p><div className="project-links">{project.url && <a className="text-link" href={project.url} target="_blank" rel="noreferrer">Explore project <ArrowUpRight size={16} /></a>}{project.repositoryUrl && <a className="text-link" href={project.repositoryUrl} target="_blank" rel="noreferrer">Source code <Github size={16} /></a>}{!project.url && !project.repositoryUrl && <a className="text-link" href={`mailto:${settings.contactEmail}?subject=${encodeURIComponent(`Tell me about ${project.title}`)}`}>Ask about this project <ArrowUpRight size={16} /></a>}</div></div></article>)}</div>
        {!data.projects.length && <div className="empty-state">The next project is taking shape. Follow our GitHub for updates.</div>}
      </section>
      <section className="team-section section-wrap section-space" id="team"><div className="section-heading"><span className="eyebrow"><span className="section-number">04</span> THE PEOPLE</span><span className="section-side-note">INDIVIDUALLY CURIOUS.<br />COLLECTIVELY NUCLEUS.</span></div><div className="split-heading"><h2>The minds<br /><em>behind the spark.</em></h2><p>Students, collaborators, and your next teammates.<br />Meet the people making it happen.</p></div>
        <div className="team-grid">{data.team.slice(0, 6).map((member, index) => <article className="member-card" key={member.id}><span className={`member-avatar avatar-${index % 3}`} aria-hidden="true">{member.initials}<span>✳</span></span><div><h3>{member.name}</h3><p>{member.role}</p></div><span className="member-number">{String(index + 1).padStart(2, '0')}</span></article>)}</div><a className="button outline team-expand" href="/team">Meet all {data.team.length} minds <ArrowUpRight size={17} /></a>
      </section>
      <section className="faq-section section-wrap section-space"><div><span className="eyebrow"><span className="section-number">05</span> STILL CURIOUS?</span><h2>Good questions.<br /><em>Start here.</em></h2><a className="text-link" href={`mailto:${settings.contactEmail}`}>Ask us something else <ArrowUpRight size={17} /></a></div><div className="faq-list">{faqs.map(([q, a], i) => <div className={`faq-item ${faq === i ? 'expanded' : ''}`} key={q}><h3><button aria-expanded={faq === i} aria-controls={`faq-${i}`} onClick={() => setFaq(faq === i ? null : i)}><span>{q}</span>{faq === i ? <Minus size={18} /> : <Plus size={18} />}</button></h3><div id={`faq-${i}`} hidden={faq !== i}><p>{a}</p></div></div>)}</div></section>
      <section className="join-section section-wrap"><div className="join-orbit" aria-hidden="true" /><span className="eyebrow"><span className="status-dot" /> YOUR NEXT CHAPTER</span><h2>There’s room for<br /><em>your kind of curious.</em></h2><p>You don’t need to have it all figured out.<br />Just bring an idea. Or a question. Or yourself.</p><button className="button primary" onClick={() => setApplyOpen(true)}>{settings.recruitmentOpen ? 'Find your place at Nucleus' : 'Connect with Nucleus'}<ArrowUpRight size={20} /></button><span className="join-status">{settings.recruitmentOpen ? `Applications open · ${settings.cycle} intake` : 'Follow along for the next intake'}</span></section>
      </>}
    </main>
    <footer className="site-footer section-wrap" id="contact"><div className="footer-top"><a className="brand" href={homeLink('#home')}><Logo /><span>NUCLEUS<small>A CONNECTION WORTH MAKING.</small></span></a><div className="footer-socials"><a href={settings.instagramUrl} target="_blank" rel="noreferrer" aria-label="Nucleus Instagram"><Instagram size={19} /></a><a href={settings.linkedinUrl} target="_blank" rel="noreferrer" aria-label="Nucleus LinkedIn"><Linkedin size={19} /></a><a href={settings.githubUrl} target="_blank" rel="noreferrer" aria-label="Nucleus GitHub"><Github size={19} /></a><a href={`mailto:${settings.contactEmail}`} aria-label="Email Nucleus"><Mail size={19} /></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Nucleus SJEC</span><span>Mangaluru, India · Made of many minds.</span><a href={homeLink('#home')}>Back to the beginning <ArrowUpRight size={14} /></a></div><div className="footer-word" aria-hidden="true">NUCLEUS<span>✳</span></div></footer>
    {applyOpen && <ApplyForm settings={settings} online={online} onClose={() => setApplyOpen(false)} />}
    {domain !== null && <Modal title={`${domains[domain].title} ${domains[domain].subtitle}`} onClose={() => setDomain(null)}><p className="modal-lead">{domains[domain].detail}</p><div className="domain-tags">{domains[domain].tags.map(tag => <span key={tag}>{tag}</span>)}</div><button className="button primary" onClick={() => { setDomain(null); setApplyOpen(true); }}>Find your next connection <ArrowUpRight size={17} /></button></Modal>}
  </>;
}
=======
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, ArrowDown, Menu, X, BrainCircuit, Code2, Network, Github, Instagram, Linkedin, Mail, Check, Sparkles, LoaderCircle, Plus, Minus } from 'lucide-react';
import { Intro, Logo } from './components/Logo';
import Modal from './components/Modal';
import { api } from './api';
import type { SiteData, SiteSettings } from './types';
import seed from '../shared/public-data.json';
import LogoLanding from './components/LogoLanding';
import EventExplorer from './components/EventExplorer';
import DomainParallax from './components/DomainParallax';

const domains = [
  { id: 'aiml', num: '01', title: 'Artificial Intelligence', subtitle: '& Machine Learning', icon: BrainCircuit, tags: ['Intelligence', 'Research', 'Possibility'], description: 'From a first model to the next big question. Explore the systems that learn, adapt, and open up entirely new possibilities.', detail: 'Explore model building, machine learning foundations, research papers, and practical AI applications. Bring your curiosity; build your understanding through collaborative experiments.' },
  { id: 'web', num: '02', title: 'Web Development', subtitle: '& Digital Experiences', icon: Code2, tags: ['Design', 'Build', 'Ship'], description: 'Make something people can actually use. Turn your ideas into thoughtful interfaces and reliable, real-world applications.', detail: 'Work across frontend and backend development, UI design, APIs, and deployment. Learn by making useful applications and sharing feedback with other builders.' },
  { id: 'dsa', num: '03', title: 'Data Structures', subtitle: '& Algorithms', icon: Network, tags: ['Logic', 'Patterns', 'Problem-solving'], description: 'Learn to see the elegant solution. Sharpen your thinking, break down hard problems, and build a stronger foundation.', detail: 'Develop problem-solving habits through data structures, algorithmic thinking, peer practice, and competitive programming. Learn to explain both your solution and why it works.' },
] as const;

function ApplyForm({ settings, online, onClose }: { settings: SiteSettings; online: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [reference, setReference] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try { const result = await api<{ id: string }>('/applications', { method: 'POST', body: JSON.stringify({ ...fields, consent: fields.consent === 'on' }) }); setReference(result.id); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Modal title={reference ? 'You’re in the conversation.' : settings.recruitmentOpen ? 'Your next connection starts here.' : 'Good things are ahead.'} onClose={onClose}>
    {reference ? <div className="success-panel"><span className="success-icon"><Check /></span><p>Your application is saved. The team will review it and contact you using the email you provided.</p><span className="eyebrow">Your application reference</span><code>{reference}</code><p className="muted small">Save this number if you need to follow up.</p><button className="button primary" onClick={onClose}>Back to exploring <ArrowRight size={17} /></button></div>
      : !settings.recruitmentOpen ? <><p className="modal-lead">{settings.recruitmentMessage}</p><p className="muted">You can still explore our domains and projects, or reach out to introduce yourself.</p><a className="button primary" href={settings.instagramUrl} target="_blank" rel="noreferrer">Follow the next chapter <Instagram size={18} /></a><a className="text-link" href={`mailto:${settings.contactEmail}`}>Contact the team <ArrowUpRight size={16} /></a></>
      : <><p className="modal-lead">Curiosity matters more than knowing everything. Tell us a little about yourself.</p><form onSubmit={submit} className="application-form">
        <div className="form-grid"><label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Full name" /></label><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label></div>
        <div className="form-grid"><label>Year of study<select name="year" required defaultValue=""><option value="" disabled>Select year</option>{[1, 2, 3, 4].map(year => <option key={year} value={year}>Year {year}</option>)}</select></label><label>Your domain<select name="domain" required defaultValue=""><option value="" disabled>What interests you?</option><option value="aiml">AI & Machine Learning</option><option value="web">Web Development</option><option value="dsa">Data Structures & Algorithms</option></select></label></div>
        <label>What would you like to learn or build?<textarea name="motivation" rows={4} minLength={30} maxLength={1600} required placeholder="Tell us what makes you curious. No perfect answers needed. (30+ characters)" /></label>
        <label>Portfolio or GitHub <span className="muted">(optional)</span><input name="portfolio" type="url" placeholder="https://" maxLength={500} /></label>
        <label className="honeypot" aria-hidden="true">Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label className="checkbox-label"><input type="checkbox" name="consent" required /><span>I agree that the Nucleus team may use these details to review my application and contact me about recruitment.</span></label>
        <p className="small muted">Only the club’s administrators can access applications. To request correction or deletion, email {settings.contactEmail}.</p>
        {error && <p className="form-error" role="alert">{error}</p>}{!online && <p className="form-error">Applications are temporarily unavailable. Please reconnect and try again.</p>}
        <button className="button primary full-width" disabled={busy || !online}>{busy ? <><LoaderCircle className="spin" size={18} /> Sending application…</> : <>Make the connection <ArrowUpRight size={18} /></>}</button>
      </form></>}
  </Modal>;
}

export default function App({ initialData = seed }: { initialData?: SiteData }) {
  const [data, setData] = useState<SiteData>(initialData), [online, setOnline] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false), [applyOpen, setApplyOpen] = useState(false);
  const [domain, setDomain] = useState<number | null>(null), [teamExpanded, setTeamExpanded] = useState(false), [faq, setFaq] = useState<number | null>(0);
  const location = useLocation();

  useEffect(() => {
    const abort = new AbortController();
    const refresh = () => api<SiteData>('/site', { signal: abort.signal }).then(site => { setData(site); setOnline(true); }).catch(error => { if (error.name !== 'AbortError') setOnline(false); });
    void refresh();
    window.addEventListener('focus', refresh);
    return () => { abort.abort(); window.removeEventListener('focus', refresh); };
  }, []);

  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const settings = data.settings;
  const faqs = [
    ['Do I need to be an expert to join?', 'No. A willingness to learn and contribute is a great starting point. Pick a domain that makes you curious and tell us what you’d like to explore.'],
    ['What can I work on at Nucleus?', 'Our three core domains are AI & Machine Learning, Web Development, and Data Structures & Algorithms. Explore hands-on projects, sessions, and collaborative learning with the community.'],
    ['When can I apply?', settings.recruitmentOpen ? `Applications are open for our ${settings.cycle} intake. Use the Join Nucleus button to apply.${settings.recruitmentDeadline ? ` The deadline is ${new Date(settings.recruitmentDeadline).toLocaleDateString('en-IN', { dateStyle: 'long' })}.` : ''}` : settings.recruitmentMessage],
    ['How do I get in touch?', `Write to ${settings.contactEmail}, or find Nucleus on Instagram and LinkedIn. We’d love to hear your questions and ideas.`],
  ];

  // Make the Logo Landing Animation the main Home Page
  if (location.pathname === '/') {
    return (
      <div className="home-scroll-container" style={{ background: 'var(--bg)' }}>
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
          <header className="site-header" style={{ position: 'absolute', top: 0, zIndex: 100, width: '100%', background: 'transparent', border: 'none' }}>
            <Link className="brand" to="/" aria-label="Nucleus home"><Logo /><span>NUCLEUS<small>SJEC · MANGALURU</small></span></Link>
            <nav className={menuOpen ? 'navigation open' : 'navigation'} aria-label="Main navigation">{[['Home', '/'], ['The idea', '/about'], ['Experiences', '/events'], ['Our work', '/projects'], ['The people', '/team']].map(([label, href]) => <Link key={href} to={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}</nav>
            <button className="button header-cta" onClick={() => setApplyOpen(true)}>{settings.recruitmentOpen ? 'Join Nucleus' : 'Stay connected'}<ArrowUpRight size={16} /></button>
            <button className="icon-button menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
          </header>
          <LogoLanding />
        </div>
        
        <DomainParallax
          domains={domains.map((item, idx) => ({
            ...item,
            onClick: () => setDomain(idx),
          }))}
        />

        <footer className="site-footer section-wrap" id="contact"><div className="footer-top"><Link className="brand" to="/"><Logo /><span>NUCLEUS<small>A CONNECTION WORTH MAKING.</small></span></Link><div className="footer-socials"><a href={settings.instagramUrl} target="_blank" rel="noreferrer" aria-label="Nucleus Instagram"><Instagram size={19} /></a><a href={settings.linkedinUrl} target="_blank" rel="noreferrer" aria-label="Nucleus LinkedIn"><Linkedin size={19} /></a><a href={settings.githubUrl} target="_blank" rel="noreferrer" aria-label="Nucleus GitHub"><Github size={19} /></a><a href={`mailto:${settings.contactEmail}`} aria-label="Email Nucleus"><Mail size={19} /></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Nucleus SJEC</span><span>Mangaluru, India · Made of many minds.</span><Link to="/">Back to the beginning <ArrowUpRight size={14} /></Link></div><div className="footer-word" aria-hidden="true">NUCLEUS<span>✳</span></div></footer>

        {applyOpen && <ApplyForm settings={settings} online={online} onClose={() => setApplyOpen(false)} />}
        {domain !== null && <Modal title={`${domains[domain].title} ${domains[domain].subtitle}`} onClose={() => setDomain(null)}><p className="modal-lead">{domains[domain].detail}</p><div className="domain-tags">{domains[domain].tags.map(tag => <span key={tag}>{tag}</span>)}</div><button className="button primary" onClick={() => { setDomain(null); setApplyOpen(true); }}>Find your next connection <ArrowUpRight size={17} /></button></Modal>}
      </div>
    );
  }

  return <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="site-header"><Link className="brand" to="/" aria-label="Nucleus home"><Logo /><span>NUCLEUS<small>SJEC · MANGALURU</small></span></Link>
      <nav className={menuOpen ? 'navigation open' : 'navigation'} aria-label="Main navigation">{[['Home', '/'], ['The idea', '/about'], ['Experiences', '/events'], ['Our work', '/projects'], ['The people', '/team']].map(([label, href]) => <Link key={href} to={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}</nav>
      <button className="button header-cta" onClick={() => setApplyOpen(true)}>{settings.recruitmentOpen ? 'Join Nucleus' : 'Stay connected'}<ArrowUpRight size={16} /></button>
      <button className="icon-button menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
    </header>
    <main id="main-content">
      {!online && <div className="connection-banner" role="status">You’re viewing saved club information. Live updates are temporarily unavailable. <button onClick={() => window.location.reload()}>Try again</button></div>}

      <Routes>
        <Route path="/events" element={
          <EventExplorer key={data.events.map(event => event.id).join(',')} events={data.events} />
        } />

        <Route path="/about" element={
          <section className="about section-wrap section-space" id="about">
            <div className="domain-grid">{domains.map((item, index) => <button className={`domain-card domain-${item.id}`} key={item.id} onClick={() => setDomain(index)}><div className="domain-card-top"><item.icon size={30} strokeWidth={1.2} /><span>/{item.num}</span></div><h3>{item.title}<span>{item.subtitle}</span></h3><p>{item.description}</p><div className="domain-tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div><span className="domain-explore">Find your spark <ArrowUpRight size={19} /></span></button>)}</div>
          </section>
        } />

        <Route path="/projects" element={
          <section className="projects-section section-wrap section-space" id="projects"><div className="section-heading"><span className="eyebrow"><span className="section-number">03</span> IDEAS IN THE REAL WORLD</span><a className="text-link" href={settings.githubUrl} target="_blank" rel="noreferrer">Our GitHub <ArrowUpRight size={16} /></a></div>
            <div className="split-heading"><h2>Less someday.<br /><span>More <em>built it.</em></span></h2><p>Real problems. Fresh perspectives.<br />A look at what our community is putting into the world.</p></div>
            <div className="project-grid">{data.projects.map((project, index) => <article className="project-card" key={project.id}><div className="project-visual" aria-hidden="true"><div className="project-visual-grid" /><div className="laundry-graphic"><div className="laundry-top"><span /><i /><i /></div><div className="laundry-drum"><span /><span /><span /></div><div className="laundry-bottom" /></div><span className="project-visual-label">CONCEPT → CODE → CONNECTION</span><span className="project-counter">0{index + 1}</span></div><div className="project-copy"><div className="project-meta"><span>{project.domain}</span><span><i />{project.status}</span></div><h3>{project.title}<ArrowUpRight size={28} strokeWidth={1.2} /></h3><p>{project.description}</p><div className="project-links">{project.url && <a className="text-link" href={project.url} target="_blank" rel="noreferrer">Explore project <ArrowUpRight size={16} /></a>}{project.repositoryUrl && <a className="text-link" href={project.repositoryUrl} target="_blank" rel="noreferrer">Source code <Github size={16} /></a>}{!project.url && !project.repositoryUrl && <a className="text-link" href={`mailto:${settings.contactEmail}?subject=${encodeURIComponent(`Tell me about ${project.title}`)}`}>Ask about this project <ArrowUpRight size={16} /></a>}</div></div></article>)}</div>
            {!data.projects.length && <div className="empty-state">The next project is taking shape. Follow our GitHub for updates.</div>}
          </section>
        } />

        <Route path="/team" element={
          <section className="team-section section-wrap section-space" id="team"><div className="section-heading"><span className="eyebrow"><span className="section-number">04</span> THE PEOPLE</span><span className="section-side-note">INDIVIDUALLY CURIOUS.<br />COLLECTIVELY NUCLEUS.</span></div><div className="split-heading"><h2>The minds<br /><em>behind the spark.</em></h2><p>Students, collaborators, and your next teammates.<br />Meet the people making it happen.</p></div>
            <div className="team-grid">{data.team.slice(0, teamExpanded ? undefined : 6).map((member, index) => <article className="member-card" key={member.id}><span className={`member-avatar avatar-${index % 3}`} aria-hidden="true">{member.initials}<span>✳</span></span><div><h3>{member.name}</h3><p>{member.role}</p></div><span className="member-number">{String(index + 1).padStart(2, '0')}</span></article>)}</div>{data.team.length > 6 && <button className="button outline team-expand" onClick={() => setTeamExpanded(!teamExpanded)} aria-expanded={teamExpanded}>{teamExpanded ? 'Show less' : `Meet all ${data.team.length} minds`}{teamExpanded ? <Minus size={17} /> : <Plus size={17} />}</button>}
          </section>
        } />
      </Routes>
    </main>
    {location.pathname !== '/about' && location.pathname !== '/events' && <footer className="site-footer section-wrap" id="contact"><div className="footer-top"><Link className="brand" to="/"><Logo /><span>NUCLEUS<small>A CONNECTION WORTH MAKING.</small></span></Link><div className="footer-socials"><a href={settings.instagramUrl} target="_blank" rel="noreferrer" aria-label="Nucleus Instagram"><Instagram size={19} /></a><a href={settings.linkedinUrl} target="_blank" rel="noreferrer" aria-label="Nucleus LinkedIn"><Linkedin size={19} /></a><a href={settings.githubUrl} target="_blank" rel="noreferrer" aria-label="Nucleus GitHub"><Github size={19} /></a><a href={`mailto:${settings.contactEmail}`} aria-label="Email Nucleus"><Mail size={19} /></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Nucleus SJEC</span><span>Mangaluru, India · Made of many minds.</span><Link to="/">Back to the beginning <ArrowUpRight size={14} /></Link></div><div className="footer-word" aria-hidden="true">NUCLEUS<span>✳</span></div></footer>}
    {applyOpen && <ApplyForm settings={settings} online={online} onClose={() => setApplyOpen(false)} />}
    {domain !== null && <Modal title={`${domains[domain].title} ${domains[domain].subtitle}`} onClose={() => setDomain(null)}><p className="modal-lead">{domains[domain].detail}</p><div className="domain-tags">{domains[domain].tags.map(tag => <span key={tag}>{tag}</span>)}</div><button className="button primary" onClick={() => { setDomain(null); setApplyOpen(true); }}>Find your next connection <ArrowUpRight size={17} /></button></Modal>}
  </>;
}
>>>>>>> 24551fe568b8ad3d66a35507c45e3569b24f2d26
