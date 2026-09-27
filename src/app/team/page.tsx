import type { Metadata } from 'next';
import TeamShowcase from '../../components/team/TeamShowcase';
import { exampleCore, exampleMembers } from '../../components/team/team-data';

export const metadata: Metadata = {
  title: 'The people',
  description: 'Different minds. One gravitational pull. Meet the core and the constellation behind Nucleus SJEC.',
};

// Real club directory, sourced from shared/public-data.json:
// 12 core roles plus the wider roster grouped by team.
export default function TeamPage() {
  return <TeamShowcase clubName="Nucleus" core={exampleCore} members={exampleMembers} />;
}
