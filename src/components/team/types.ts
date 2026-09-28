export interface CoreMember {
  id: string;
  name: string;
  role: string;
  image?: string;
  bio?: string;
  socials?: { twitter?: string; linkedin?: string; instagram?: string; email?: string };
}

export interface ClubMember {
  id: string;
  name: string;
  role: string;
  team: string;
  image?: string;
  bio?: string;
  socials?: { twitter?: string; linkedin?: string; instagram?: string; email?: string };
}

export interface TeamShowcaseProps {
  clubName: string;
  core: CoreMember[];
  members: ClubMember[];
}

// Both core and community members can open the same profile overlay.
export type ProfileSubject = CoreMember | ClubMember;
