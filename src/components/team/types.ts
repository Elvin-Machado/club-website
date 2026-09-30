export interface CoreMember {
  id: string;
  name: string;
  role: string;
  image?: string;
  bio?: string;
  socials?: Record<string, string | undefined>;
}

export interface ClubMember {
  id: string;
  name: string;
  role: string;
  team: string;
  image?: string;
  bio?: string;
  socials?: Record<string, string | undefined>;
}

export interface TeamShowcaseProps {
  clubName: string;
  core: CoreMember[];
  members: ClubMember[];
}

// Former members who have graduated or left the club. Alumni are kept in a
// separate directory (alumni-data.ts) so they never appear in the active
// core orbit or the current community cards by accident.
export interface AlumniMember {
  id: string;
  name: string;
  /** Their former club designation or role. */
  role: string;
  image?: string;
  /** Former team, when known. */
  team?: string;
  /** Club / technical domain they specialised in. */
  domain?: string;
  /** Academic department, when preferred over domain. */
  department?: string;
  /** Pass-out year at SJEC. */
  graduationYear?: number;
  /** Current organisation, when they are working. */
  organization?: string;
  /** Current job title, when they are working. */
  jobTitle?: string;
  /** Higher-studies course/institution, when applicable. */
  higherStudies?: string;
  skills?: string[];
  bio?: string;
  socials?: { twitter?: string; linkedin?: string; instagram?: string; email?: string };
}

// Core, community, and alumni members can all open the same profile overlay.
export type ProfileSubject = CoreMember | ClubMember | AlumniMember;
