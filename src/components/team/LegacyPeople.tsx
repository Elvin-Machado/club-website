import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import TeamShowcase from './TeamShowcase';
import MembersShowcase from './MembersShowcase';
import AlumniShowcase from './AlumniShowcase';
import { TeamNavigationContext, type TeamLinkProps, type TeamNavigation } from './TeamNavigation';
import { exampleCore, exampleMembers } from './team-data';
import { alumniMembers, currentTeam } from './alumni-data';
import { organiseTeam } from '../../lib/team';
import type { Member } from '../../types';

function RouterLink({ href, onNavigate, onClick, ...props }: TeamLinkProps) {
  if (href.startsWith('#')) return <a href={href} onClick={onClick} {...props} />;
  return <Link to={href} {...props} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && props.target !== '_blank') onNavigate?.(event);
  }} />;
}

/** Keep the legacy Vite/Express entry on the same People pages and directory. */
export default function LegacyPeople({ team }: { team: Member[] }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navigation = useMemo<TeamNavigation>(() => ({ pathname, push: href => navigate(href), prefetch: () => {}, Link: RouterLink }), [pathname, navigate]);
  const { core, members } = useMemo(() => {
    const profiles = new Map([...exampleCore, ...exampleMembers].map(member => [member.id, member]));
    const coreIds = new Set([...exampleCore.map(member => member.id), ...organiseTeam(team).core.flatMap(role => role.people.map(member => member.id))]);
    const profile = (member: Member) => ({ ...profiles.get(member.id), ...member, bio: member.bio ?? profiles.get(member.id)?.bio });
    return currentTeam(
      team.filter(member => coreIds.has(member.id)).map(profile),
      team.filter(member => !coreIds.has(member.id)).map(member => ({ team: 'Community', ...profile(member) })),
      alumniMembers,
    );
  }, [team]);
  const route = pathname.replace(/\/$/, '');
  return <TeamNavigationContext.Provider value={navigation}>
    {route === '/members' ? <MembersShowcase clubName="Nucleus" members={members} />
      : route === '/alumni' ? <AlumniShowcase clubName="Nucleus" />
        : <TeamShowcase clubName="Nucleus" core={core} members={members} />}
  </TeamNavigationContext.Provider>;
}
