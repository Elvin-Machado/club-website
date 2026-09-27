import type { ClubMember, CoreMember } from './types';

// Real club directory, sourced from shared/public-data.json.
//
// No member photographs exist in the codebase, so `image` is intentionally
// unset everywhere and the UI falls back to initials (see MemberPhoto). Add a
// photo path per person as real portraits become available.
//
// The twelve core seats mirror shared/public-data.json exactly. There is no
// System Design Lead in the source data, so that seat is left out rather than
// filled with a placeholder.
export const exampleCore: CoreMember[] = [
  {
    id: 'poorvik',
    name: 'Poorvik Kuthyala',
    role: 'President',
    bio: 'Helps shape the direction of Nucleus, connects the team around a shared purpose, and makes space for ideas to become meaningful work.',
  },
  {
    id: 'dinol',
    name: 'Dinol Castelino',
    role: 'Vice President',
    bio: 'Connects people and plans across the club, supports the core team, and helps keep our shared goals moving forward.',
  },
  {
    id: 'joylin',
    name: 'Joylin Mathias',
    role: 'Secretary',
    bio: 'Keeps the club connected through clear communication, organised records, and the coordination that helps each initiative run smoothly.',
  },
  {
    id: 'prajwal',
    name: 'Prajwal Gaonkar',
    role: 'Tech Lead',
    bio: 'Guides the technical direction of our work, brings builders together, and helps the team turn ambitious ideas into practical projects.',
  },
  {
    id: 'mohit',
    name: 'Mohit',
    role: 'AI & ML Lead',
    bio: 'Helps our AI and machine learning community explore models, ask better questions, and learn through experiments and shared discovery.',
  },
  {
    id: 'rakshith',
    name: 'Rakshith Dsouza',
    role: 'Dev Lead',
    bio: 'Connects design with development, guides collaborative builds, and helps members create useful digital experiences from the ground up.',
  },
  {
    id: 'navya',
    name: 'Navya Suvarna',
    role: 'DSA Lead',
    bio: 'Helps members strengthen their problem-solving foundations through algorithms, peer practice, and conversations about how and why a solution works.',
  },
  {
    id: 'manvitha',
    name: 'Manvitha Lewis',
    role: 'Discipline Head',
    bio: 'Helps maintain a respectful, welcoming environment and supports the shared standards that allow every member to learn and contribute.',
  },
  {
    id: 'karthik',
    name: 'Karthik',
    role: 'Treasurer',
    bio: "Looks after the club's finances, helps plan resources responsibly, and supports the decisions that make our activities possible.",
  },
  {
    id: 'deona',
    name: 'Deona Rego',
    role: 'Event Lead',
    bio: 'Brings people together through club experiences, coordinating the details that turn a shared idea into a gathering of curious minds.',
  },
  {
    id: 'nishanth',
    name: 'Nishanth Uday Naik',
    role: 'Planning & Strategy Lead',
    bio: "Connects today's ideas with tomorrow's opportunities, shapes action plans, and helps the team move towards clear, achievable goals.",
  },
  {
    id: 'sweedan',
    name: 'Sweedan Cardoza',
    role: 'Media Lead',
    bio: 'Helps tell the Nucleus story through visuals, updates, and the moments we share, connecting what happens inside the club with the wider community.',
  },
];

export const exampleMembers: ClubMember[] = [
  { id: 'salim', name: 'Salim Pallikal', role: 'Member', team: 'Community' },
  { id: 'nikhitha', name: 'Nikhitha Dsouza', role: 'Member', team: 'Community' },
  { id: 'saniya', name: 'Aisahath Saniya', role: 'Member', team: 'Community' },
];
