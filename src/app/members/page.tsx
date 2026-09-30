import type { Metadata } from 'next';
import MembersShowcase from '../../components/team/MembersShowcase';
import NextTeamNavigation from '../../components/team/NextTeamNavigation';
import { exampleCore, exampleMembers } from '../../components/team/team-data';
import { alumniMembers, currentTeam } from '../../components/team/alumni-data';

export const metadata: Metadata = {
  title: 'Members',
  description: 'Meet the current NUCLEUS community of curious minds, builders, and collaborators at SJEC.',
  alternates: {
    canonical: '/members',
  },
  openGraph: {
    title: 'Members | Nucleus SJEC',
    description: 'Meet the current NUCLEUS community of curious minds, builders, and collaborators at SJEC.',
    url: '/members',
  },
};

export default function MembersPage() {
  const { members } = currentTeam(exampleCore, exampleMembers, alumniMembers);
  return <NextTeamNavigation><MembersShowcase clubName="Nucleus" members={members} /></NextTeamNavigation>;
}
