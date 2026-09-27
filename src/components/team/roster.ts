import type { ClubMember } from './types';

export function filterRoster(members: ClubMember[], query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return members.filter(member => {
    const text = `${member.name} ${member.team} ${member.role}`.toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  });
}

export function groupRoster(members: ClubMember[]) {
  const groups = new Map<string, ClubMember[]>();
  for (const member of members) groups.set(member.team, [...(groups.get(member.team) || []), member]);
  return [...groups.entries()];
}
