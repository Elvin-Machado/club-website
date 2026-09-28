import type { AlumniMember, ClubMember, CoreMember } from './types';

// Add verified alumni records here; leave unavailable fields unset.
// Reuse a current member's ID when they leave the club. Alumni IDs are excluded
// from the active orbit and community automatically by currentTeam below.
//
// Required: id, name, role (their former club designation).
// Optional: image, team, department, domain, graduationYear, organization,
// jobTitle, higherStudies, bio, skills, socials (linkedin, twitter, instagram,
// email). Photo paths follow the same convention as team-data.ts.
//
// The existing admin API only stores name, role and initials for active members;
// it has no alumni status or history fields. This directory is intentionally
// separate from that API and needs no new backend or authentication.
export const alumniMembers: AlumniMember[] = [];

export function currentTeam(core: CoreMember[], members: ClubMember[], alumni: AlumniMember[]) {
  const formerIds = new Set(alumni.map(member => member.id));
  return {
    core: core.filter(member => !formerIds.has(member.id)),
    members: members.filter(member => !formerIds.has(member.id)),
  };
}
