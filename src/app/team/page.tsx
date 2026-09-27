import type { Metadata } from 'next';
import TeamShowcase from '../../components/team/TeamShowcase';
import { exampleCore, exampleMembers } from '../../components/team/team-data';

export const metadata: Metadata = {
  title: 'The people',
  description: 'Different minds. One gravitational pull. Meet the core and the constellation behind Nucleus SJEC.',
};

// Example directory: 8 fictional core profiles and 30 members across 6 teams.
// Replace these imports with approved data conforming to TeamShowcaseProps.
export default function TeamPage() {
  return <TeamShowcase clubName="Nucleus" core={exampleCore} members={exampleMembers} />;
}
