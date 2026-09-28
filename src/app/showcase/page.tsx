import type { Metadata } from 'next';
import SpeakerShowcase from '../../components/showcase/SpeakerShowcase';
import type { Speaker } from '../../components/showcase/types';

export const metadata: Metadata = {
  title: 'Team showcase',
  description: 'Browse the Nucleus core team as an interactive showcase — scroll through the roster and open any profile.',
};

const portrait = (seed: string) => `https://picsum.photos/seed/nucleus-${seed}/900/1200`;

const SAMPLE_SPEAKERS: Speaker[] = [
  {
    id: 'poorvik',
    name: 'Poorvik Kuthyala',
    role: 'President',
    image: portrait('poorvik'),
    bio: 'Sets the direction for Nucleus and keeps the core team pointed at the same idea: that a club is only as good as the curiosity it protects. Runs the Monday planning wall and the annual goal reset.',
    quote: 'A club is a promise that the next idea gets taken seriously.',
    socials: { linkedin: 'https://www.linkedin.com/', twitter: 'https://twitter.com/', email: 'president@nucleussjec.in' },
  },
  {
    id: 'mohit',
    name: 'Mohit',
    role: 'AI & ML Lead',
    image: portrait('mohit'),
    bio: 'Builds the reading list and the lab nights. Spends most weekends turning vague questions into small, runnable experiments, then explaining what actually happened.',
    quote: 'Ask a better question and half the model is already built.',
    socials: { linkedin: 'https://www.linkedin.com/', email: 'aiml@nucleussjec.in' },
  },
  {
    id: 'prajwal',
    name: 'Prajwal Gaonkar',
    role: 'Technical Lead',
    image: portrait('prajwal'),
    bio: 'Connects the domains into things that ship. Reviews architecture sketches, unblocks the deploy pipeline, and keeps the repository boring in the best possible way.',
    quote: 'Reliable systems are just decisions someone wrote down.',
    socials: { linkedin: 'https://www.linkedin.com/', twitter: 'https://twitter.com/' },
  },
  {
    id: 'navya',
    name: 'Navya Suvarna',
    role: 'DSA Lead',
    image: portrait('navya'),
    bio: 'Runs the weekly problem-solving circle and the whiteboard sessions. Believes an algorithm you cannot explain is an algorithm you have not learned yet.',
    quote: 'Find the pattern first. The code is the easy part.',
    socials: { instagram: 'https://www.instagram.com/', email: 'dsa@nucleussjec.in' },
  },
  {
    id: 'rakshith',
    name: 'Rakshith Dsouza',
    role: 'Development Lead',
    image: portrait('rakshith'),
    bio: 'Bridges design and engineering. Runs the interface review, guards accessibility, and pushes prototypes out before they are comfortable.',
    quote: 'Ship it ugly, then make it beautiful in public.',
    socials: { linkedin: 'https://www.linkedin.com/', instagram: 'https://www.instagram.com/' },
  },
  {
    id: 'sweedan',
    name: 'Sweedan Cardoza',
    role: 'Media Lead',
    image: portrait('sweedan'),
    bio: 'Tells the story of what happens inside the club. Handles the visual identity, the recaps, and the quiet work of making sure the right people get credit.',
    quote: 'Every project deserves one good photograph and a clear caption.',
    socials: { instagram: 'https://www.instagram.com/', twitter: 'https://twitter.com/' },
  },
  {
    id: 'joylin',
    name: 'Joylin Mathias',
    role: 'Secretary',
    image: portrait('joylin'),
    bio: 'Holds the calendar, the records, and the reminders. Makes sure the session happens, the room is booked, and nothing important quietly falls through.',
    quote: 'Good records are the quiet reason nothing gets lost.',
    socials: { email: 'secretary@nucleussjec.in' },
  },
  {
    id: 'manvitha',
    name: 'Manvitha Lewis',
    role: 'Discipline Head',
    image: portrait('manvitha'),
    bio: 'Looks after the room so the ideas can be loud. Keeps the club welcoming, the standards clear, and the code of conduct something people actually trust.',
    quote: 'Belonging is a practice, not a poster on a wall.',
    socials: { linkedin: 'https://www.linkedin.com/', email: 'hello@nucleussjec.in' },
  },
];

export default function ShowcasePage() {
  return <SpeakerShowcase date="Nucleus SJEC · Est. 2026" title="Our Team" speakers={SAMPLE_SPEAKERS} />;
}
