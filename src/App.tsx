import { Suspense, lazy, useEffect, useRef, useState, type FormEvent } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, BrainCircuit, Code2, Network, Github, Instagram, Linkedin, Mail, Check, LoaderCircle } from 'lucide-react';
import { MorphingNavbar } from './components/ui/morphing-navbar';
import { Logo } from './components/shared/Logo';
import Modal from './components/shared/Modal';
import { api } from './api';
import type { SiteData, SiteSettings } from './types';
import seed from '../shared/public-data.json';
import LogoLanding from './components/home/LogoLanding';
import EventExplorer from './pages/EventExplorer';
import DomainParallax from './components/home/DomainParallax';
import WorkPage from './pages/WorkPage';
import PeoplePage from './pages/PeoplePage';
import VoicesMarquee from './components/home/VoicesMarquee';
import CommunityCTA from './components/home/CommunityCTA';
import Recruitment from './pages/Recruitment';
import { useReveal } from './components/ui/reveal';
import { useCinematicScroll } from './lib/use-cinematic-scroll';

const domains = [
  { id: 'aiml', num: '01', title: 'Artificial Intelligence', subtitle: '& Machine Learning', icon: BrainCircuit, whatsappUrl: 'https://chat.whatsapp.com/F2sg6LBCwibIKWJu2nhnvI', tags: ['Intelligence', 'Research', 'Possibility'], description: 'Explore machine learning, build models, and turn new questions into experiments.', detail: 'Explore model building, machine learning foundations, research papers, and practical AI applications. Bring your curiosity; build your understanding through collaborative experiments.' },
  { id: 'web', num: '02', title: 'Web Development', subtitle: '& Digital Experiences', icon: Code2, whatsappUrl: 'https://chat.whatsapp.com/L97jBsJl7vJ6ol1k68Ue9L', tags: ['Design', 'Build', 'Ship'], description: 'Design thoughtful interfaces. Build useful applications. Put your ideas on the web.', detail: 'Work across frontend and backend development, UI design, APIs, and deployment. Learn by making useful applications and sharing feedback with other builders.' },
  { id: 'dsa', num: '03', title: 'Data Structures', subtitle: '& Algorithms', icon: Network, whatsappUrl: 'https://chat.whatsapp.com/LPTqGQdnGRo24BEZyrk9vy', tags: ['Logic', 'Patterns', 'Problem-solving'], description: 'Find the patterns, solve hard problems, and build a stronger foundation.', detail: 'Develop problem-solving habits through data structures, algorithmic thinking, peer practice, and competitive programming. Learn to explain both your solution and why it works.' },
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
      : !settings.recruitmentOpen ? <><p className="modal-lead">{settings.recruitmentMessage}</p><p className="muted">You can still explore our domains and projects, or reach out to introduce yourself.</p><a className="button primary" href={settings.instagramUrl} target="_blank" rel="noreferrer">Follow Nucleus <Instagram size={18} /></a><a className="text-link" href={`mailto:${settings.contactEmail}`}>Contact the team <ArrowUpRight size={16} /></a></>
      : <><p className="modal-lead">Curiosity matters more than knowing everything. Tell us a little about yourself.</p><form onSubmit={submit} className="application-form">
        <div className="form-grid"><label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Full name" /></label><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label></div>
        <div className="form-grid"><label>Year of study<select name="year" required defaultValue=""><option value="" disabled>Select year</option>{[1, 2, 3, 4].map(year => <option key={year} value={year}>Year {year}</option>)}</select></label><label>Your domain<select name="domain" required defaultValue=""><option value="" disabled>What interests you?</option><option value="aiml">AI & Machine Learning</option><option value="web">Web Development</option><option value="dsa">Data Structures & Algorithms</option></select></label></div>
        <label>What would you like to learn or build?<textarea name="motivation" rows={4} minLength={30} maxLength={1600} required placeholder="Tell us what makes you curious. No perfect answers needed. (30+ characters)" /></label>
        <label>Portfolio or GitHub <span className="muted">(optional)</span><input name="portfolio" type="url" placeholder="https://" maxLength={500} /></label>
        <label className="honeypot" aria-hidden="true">Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label className="checkbox-label"><input type="checkbox" name="consent" required /><span>I agree that the Nucleus team may use these details to review my application and contact me about recruitment.</span></label>
        <p className="small muted">Only the club’s administrators can access applications. To request correction or deletion, email {settings.contactEmail}.</p>
        {error && <p className="form-error" role="alert">{error}</p>}{!online && <p className="form-error">Applications are temporarily unavailable. Please reconnect and try again.</p>}
        <button className="button primary full-width" disabled={busy || !online}>{busy ? <><LoaderCircle className="spin" size={18} /> Sending application…</> : <>Send application <ArrowUpRight size={18} /></>}</button>
      </form></>}
  </Modal>;
}

function SiteFooter({ settings }: { settings: SiteSettings }) {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useReveal(ref, { enabled: pathname === '/', stagger: 65, selector: '.footer-top > *, .footer-bottom > *' });
  return <footer ref={ref} className="site-footer section-wrap" id="contact">
    <div className="footer-top"><Link className="brand" to="/" aria-label="Nucleus home"><Logo /><span>NUCLEUS<small>SJEC · MANGALURU</small></span></Link>
      <div className="footer-socials">
        <a href={settings.instagramUrl} target="_blank" rel="noreferrer" aria-label="Nucleus Instagram"><Instagram size={18} /></a>
        <a href={settings.linkedinUrl} target="_blank" rel="noreferrer" aria-label="Nucleus LinkedIn"><Linkedin size={18} /></a>
        <a href={settings.githubUrl} target="_blank" rel="noreferrer" aria-label="Nucleus GitHub"><Github size={18} /></a>
        <a href={`mailto:${settings.contactEmail}`} aria-label="Email Nucleus"><Mail size={18} /></a>
      </div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Nucleus SJEC</span><span>Made of many minds.</span><a href="/admin">Admin <ArrowUpRight size={13} /></a></div>
  </footer>;
}

export default function App({ initialData = seed }: { initialData?: SiteData }) {
  const [data, setData] = useState<SiteData>(initialData), [online, setOnline] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [domain, setDomain] = useState<number | null>(null);
  const location = useLocation();
  useCinematicScroll(location.pathname === '/' && !applyOpen && !menuOpen && domain === null);

  useEffect(() => {
    const abort = new AbortController();
    const refresh = () => api<SiteData>('/site', { signal: abort.signal }).then(site => { setData(site); setOnline(true); }).catch(error => { if (error.name !== 'AbortError') setOnline(false); });
    void refresh();
    window.addEventListener('focus', refresh);
    return () => { abort.abort(); window.removeEventListener('focus', refresh); };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setApplyOpen(false); setDomain(null); setMenuOpen(false);
    const titles: Record<string, string> = { '/': 'Nucleus SJEC — A connection worth making', '/projects': 'Our work — Nucleus SJEC', '/team': 'The people — Nucleus SJEC', '/events': 'Experiences — Nucleus SJEC', '/about': 'Our domains — Nucleus SJEC', '/recruitment': 'Join the community — Nucleus SJEC' };
    document.title = titles[location.pathname] || 'Page not found — Nucleus SJEC';
  }, [location.pathname]);

  const settings = data.settings;
  const domainItems = domains.map((item, index) => ({ ...item, onClick: () => setDomain(index) }));
  const navItems = [
    { title: 'Home', href: '/' },
    { title: 'Experiences', href: '/events' },
    { title: 'Our work', href: '/projects' },
    { title: 'The people', href: '/team' },
  ];



  return <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className={`site-header${location.pathname === '/' ? ' site-header--home' : ''}`}>
      <MorphingNavbar items={navItems} settings={settings} open={menuOpen} onOpenChange={setMenuOpen} onApply={() => setApplyOpen(true)} />
    </header>
    <main id="main-content" tabIndex={-1} inert={menuOpen}>
      <Routes>
        <Route path="/" element={<><LogoLanding /><DomainParallax domains={domainItems} /><CommunityCTA isOpen={settings.recruitmentOpen} /><VoicesMarquee /></>} />
        <Route path="/about" element={<><div className="about-heading section-wrap"><span className="eyebrow">Nucleus · SJEC</span><h1>A meeting<br /><em>of minds.</em></h1></div><DomainParallax domains={domainItems} /></>} />
        <Route path="/recruitment" element={<Recruitment settings={settings} onApply={() => setApplyOpen(true)} />} />
        <Route path="/events" element={<EventExplorer events={data.events} onPublished={event => setData(current => ({ ...current, events: [...current.events.filter(item => item.id !== event.id), event] }))} />} />
        <Route path="/projects" element={<WorkPage projects={data.projects} settings={settings} />} />
        <Route path="/team" element={<PeoplePage members={data.team} />} />
        <Route path="*" element={<section className="recruitment-page section-wrap"><span className="eyebrow">404</span><h1>Lost the<br /><em>connection?</em></h1><Link className="button primary" to="/">Back to Nucleus <ArrowRight size={17} /></Link></section>} />
      </Routes>
    </main>
    {location.pathname === '/' && <SiteFooter settings={settings} />}
    {applyOpen && <ApplyForm settings={settings} online={online} onClose={() => setApplyOpen(false)} />}
    {domain !== null && <Modal title={`${domains[domain].title} ${domains[domain].subtitle}`} onClose={() => setDomain(null)}><p className="modal-lead">{domains[domain].detail}</p><div className="domain-tags">{domains[domain].tags.map(tag => <span key={tag}>{tag}</span>)}</div><button className="button primary" onClick={() => { setDomain(null); setApplyOpen(true); }}>Get involved <ArrowUpRight size={17} /></button></Modal>}
  </>;
}
