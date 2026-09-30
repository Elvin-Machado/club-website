export type Domain = 'aiml' | 'web' | 'dsa';
export interface EventPhoto { id: string; name: string; url: string; }
export interface ClubEvent { id: string; title: string; description: string; startsAt: string; endsAt: string; location: string; category: string; registrationUrl: string; albumUrl?: string; published: boolean; photos?: EventPhoto[]; trackPosition?: number; }
export interface Project { id: string; title: string; description: string; domain: string; status: string; url: string; repositoryUrl: string; published: boolean; }
export interface Member { id: string; name: string; role: string; initials: string; createdAt?: string; }
export interface SiteSettings { recruitmentOpen: boolean; recruitmentMessage: string; recruitmentDeadline: string; cycle: string; contactEmail: string; instagramUrl: string; githubUrl: string; linkedinUrl: string; }
export interface SiteData { settings: SiteSettings; events: ClubEvent[]; projects: Project[]; team: Member[]; }
export interface Application { id: string; name: string; email: string; year: string; domain: Domain; motivation: string; portfolio: string; status: string; cycle: string; createdAt: string; }
