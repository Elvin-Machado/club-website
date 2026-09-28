export interface CoreMember {
  id: string;
  name: string;
  role: string;
  image?: string;
  bio?: string;
  department?: string;
  domain?: string;
  skills?: string[];
  socials?: { twitter?: string; linkedin?: string; instagram?: string; email?: string };
}

export interface ClubMember extends CoreMember {
  team: string;
}

// `role` is the former club role. Keep IDs when moving an existing member here.
export interface AlumniMember extends CoreMember {
  team?: string;
  graduationYear?: number;
  organization?: string;
  jobTitle?: string;
  higherStudies?: string;
}

export interface TeamShowcaseProps {
  clubName: string;
  core: CoreMember[];
  members: ClubMember[];
  alumni?: AlumniMember[];
}

export type ProfileSubject = CoreMember | ClubMember | AlumniMember;
