import { useEffect, useState, type FormEvent } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Menu, X, BrainCircuit, Code2, Network, Github, Instagram, Linkedin, Mail, Check, LoaderCircle } from 'lucide-react';
import { Logo } from './components/Logo';
import Modal from './components/Modal';
import { api } from './api';
import type { SiteData, SiteSettings } from './types';
import seed from '../shared/public-data.json';
import LogoLanding from './components/LogoLanding';
import EventExplorer from './components/EventExplorer';
import DomainParallax from './components/DomainParallax';
import LegacyPeople from './components/team/LegacyPeople';
import ProjectShowcase from './components/ProjectShowcase';

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
        <label htmlFor="app-motivation">What would you like to learn or build?</label><textarea id="app-motivation" aria-label="What would you like to learn or build?" name="motivation" rows={4} minLength={30} maxLength={1600} required placeholder="Tell us what makes you curious. No perfect answers needed. (30+ characters)" />
        <label>Portfolio or GitHub <span className="muted">(optional)</span><input name="portfolio" type="url" placeholder="https://" maxLength={500} /></label>
        <label className="honeypot" aria-hidden="true">Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label className="checkbox-label"><input type="checkbox" name="consent" required /><span>I agree that the Nucleus team may use these details to review my application and contact me about recruitment.</span></label>
        <p className="small muted">Only the club’s administrators can access applications. To request correction or deletion, email {settings.contactEmail}.</p>
        {error && <p className="form-error" role="alert">{error}</p>}{!online && <p className="form-error">Applications are temporarily unavailable. Please reconnect and try again.</p>}
        <button className="button primary full-width" disabled={busy || !online}>{busy ? <><LoaderCircle className="spin" size={18} /> Sending application…</> : <>Make the connection <ArrowUpRight size={18} /></>}</button>
      </form></>}
  </Modal>;
}

function SiteFooter({ settings }: { settings: SiteSettings }) {
  return <footer className="site-footer section-wrap" id="contact">
    <div className="footer-top">
      <Link className="brand" to="/" aria-label="Nucleus home"><Logo /><span>NUCLEUS<small>SJEC · MANGALURU</small></span></Link>
      <div className="footer-socials"><a href={settings.instagramUrl} target="_blank" rel="noreferrer" aria-label="Nucleus Instagram"><Instagram size={19} /></a><a href={settings.linkedinUrl} target="_blank" rel="noreferrer" aria-label="Nucleus LinkedIn"><Linkedin size={19} /></a><a href={settings.githubUrl} target="_blank" rel="noreferrer" aria-label="Nucleus GitHub"><Github size={19} /></a><a href={`mailto:${settings.contactEmail}`} aria-label="Email Nucleus"><Mail size={19} /></a></div>
    </div>
    <div className="footer-bottom">
      <span>© {new Date().getFullYear()} Nucleus SJEC · Mangaluru, India</span>
      <a href={`mailto:${settings.contactEmail}`}>Say hello <Mail size={13} /></a>
      <Link to="/">Back to the beginning <ArrowUpRight size={13} /></Link>
    </div>
  </footer>;
}

export default function App({ initialData = seed }: { initialData?: SiteData }) {
  const [data, setData] = useState<SiteData>(initialData), [online, setOnline] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false), [applyOpen, setApplyOpen] = useState(false);
  const [domain, setDomain] = useState<number | null>(null);
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

        <SiteFooter settings={settings} />

        {applyOpen && <ApplyForm settings={settings} online={online} onClose={() => setApplyOpen(false)} />}
        {domain !== null && <Modal title={`${domains[domain].title} ${domains[domain].subtitle}`} onClose={() => setDomain(null)}><p className="modal-lead">{domains[domain].detail}</p><div className="domain-tags">{domains[domain].tags.map(tag => <span key={tag}>{tag}</span>)}</div><button className="button primary" onClick={() => { setDomain(null); setApplyOpen(true); }}>Find your next connection <ArrowUpRight size={17} /></button></Modal>}
      </div>
    );
  }

  if (/^\/(?:team|members|alumni)\/?$/.test(location.pathname)) return <LegacyPeople team={data.team} />;

  return <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className={`site-header${location.pathname === '/projects' ? ' projects-header' : ''}`}><Link className="brand" to="/" aria-label="Nucleus home"><Logo /><span>NUCLEUS<small>SJEC · MANGALURU</small></span></Link>
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

        <Route path="/projects" element={<ProjectShowcase projects={data.projects} settings={settings} />} />

      </Routes>
    </main>
    {location.pathname !== '/about' && location.pathname !== '/events' && location.pathname !== '/team' && location.pathname !== '/members' && location.pathname !== '/alumni' && <SiteFooter settings={settings} />}
    {applyOpen && <ApplyForm settings={settings} online={online} onClose={() => setApplyOpen(false)} />}
    {domain !== null && <Modal title={`${domains[domain].title} ${domains[domain].subtitle}`} onClose={() => setDomain(null)}><p className="modal-lead">{domains[domain].detail}</p><div className="domain-tags">{domains[domain].tags.map(tag => <span key={tag}>{tag}</span>)}</div><button className="button primary" onClick={() => { setDomain(null); setApplyOpen(true); }}>Find your next connection <ArrowUpRight size={17} /></button></Modal>}
  </>;
}
