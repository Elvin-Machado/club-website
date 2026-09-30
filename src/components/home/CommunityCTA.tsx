import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { TextReveal } from '../ui/text-reveal';

export default function CommunityCTA({ isOpen }: { isOpen: boolean }) {
  return <section className="community-section community-section--reveal">
    <TextReveal className="eyebrow" text="JOIN THE COMMUNITY" blur="4px" />
    <h2 aria-label="Learn. Build. Collaborate."><TextReveal text={'LEARN.\u00a0BUILD.\u00a0'} /><TextReveal text={'COLLABORATE.\u00a0'} delay={.12} /></h2>
    <TextReveal as="p" mode="word" blur="4px" stagger={.04} text={isOpen ? "Applications are open. We're looking for passionate students who are ready to grow, ship, and lead." : "Applications are currently closed. Check out our latest projects and events to see what we're building."} />
    <div className="community-actions"><Link to="/recruitment" className="button primary"><TextReveal text="JOIN CLUB" blur="4px" y={6} /> <ArrowUpRight size={16} /></Link><Link to="/projects" className="button outline"><TextReveal text="PROJECTS" blur="4px" y={6} /></Link></div>
  </section>;
}
