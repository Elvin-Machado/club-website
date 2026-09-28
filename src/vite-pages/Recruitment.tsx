import { ArrowUpRight, Instagram } from 'lucide-react';
import type { SiteSettings } from '../types';
import { Reveal } from '../components/ui/reveal';

export default function Recruitment({ settings, onApply }: { settings: SiteSettings; onApply: () => void }) {
  return <section className="recruitment-page section-wrap">
    <Reveal stagger={80}><span className="eyebrow" data-reveal-item>Your next chapter</span><h1 data-reveal-item>{settings.recruitmentOpen ? <>Find your<br /><em>people.</em></> : <>Stay<br /><em>connected.</em></>}</h1>
      <p data-reveal-item>{settings.recruitmentOpen ? 'Bring your curiosity. Let’s build something together.' : settings.recruitmentMessage}</p>
      {settings.recruitmentOpen ? <button className="button primary" data-reveal-item onClick={onApply}>Apply to Nucleus <ArrowUpRight size={18} /></button>
        : <a className="button primary" data-reveal-item href={settings.instagramUrl} target="_blank" rel="noreferrer">Follow Nucleus <Instagram size={18} /></a>}
      <a className="text-link" data-reveal-item href={`mailto:${settings.contactEmail}`}>Get in touch <ArrowUpRight size={16} /></a>
    </Reveal>
  </section>;
}
