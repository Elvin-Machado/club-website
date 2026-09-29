import type { Metadata } from 'next';
import TeamShowcase from '../../components/team/TeamShowcase';
import { exampleCore, exampleMembers } from '../../components/team/team-data';
import { alumniMembers, currentTeam } from '../../components/team/alumni-data';

export const metadata: Metadata = {
  title: 'The people',
  description: 'Meet the core team at the centre of NUCLEUS, then explore our current members and alumni.',
};

// Real club directory, sourced from shared/public-data.json:
// 12 core roles plus the wider roster grouped by team.
// Alumni are filtered out automatically so they never appear in the active orbit.
export default function TeamPage() {
  const { core, members } = currentTeam(exampleCore, exampleMembers, alumniMembers);
  return <TeamShowcase clubName="Nucleus" core={core} members={members} />;
}
