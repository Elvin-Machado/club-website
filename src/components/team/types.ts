export interface CoreMember {
  id: string;
  name: string;
  role: string;
  image: string;
  bio?: string;
  socials?: { twitter?: string; linkedin?: string; instagram?: string; email?: string };
}

export interface ClubMember {
  id: string;
  name: string;
  role: string;
  team: string;
  image?: string;
}

export interface TeamShowcaseProps {
  clubName: string;
  core: CoreMember[];
  members: ClubMember[];
}
