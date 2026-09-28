export interface SpeakerSocials {
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  email?: string;
}

export interface Speaker {
  id: string;
  name: string;
  role: string;
  image: string;
  bio?: string;
  quote?: string;
  socials?: SpeakerSocials;
}

export interface SpeakerShowcaseProps {
  date?: string;
  title?: string;
  speakers: Speaker[];
}

export const speakerLayout = {
  card: (id: string) => `speaker-card-${id}`,
  image: (id: string) => `speaker-image-${id}`,
  name: (id: string) => `speaker-name-${id}`,
  trigger: (id: string) => `speaker-trigger-${id}`,
  heading: (id: string) => `speaker-heading-${id}`,
};

export const SOCIAL_ORDER: ReadonlyArray<keyof SpeakerSocials> = ['twitter', 'linkedin', 'instagram', 'email'];

export function socialHref(network: keyof SpeakerSocials, value: string) {
  return network === 'email' ? `mailto:${value}` : value;
}
