import type { Member } from '../types';

export const coreRoles = [
  { id: 'president', title: 'President', aliases: ['President'], headline: 'A vision worth\nbuilding together.', intro: 'Helps shape the direction of Nucleus, connects the team around a shared purpose, and makes space for ideas to become meaningful work.', focus: ['Vision', 'Community', 'Leadership'] },
  { id: 'vice-president', title: 'Vice President', aliases: ['Vice President', 'Vicepresident'], headline: 'Turning intention\ninto momentum.', intro: 'Connects people and plans across the club, supports the core team, and helps keep our shared goals moving forward.', focus: ['Collaboration', 'Coordination', 'Momentum'] },
  { id: 'secretary', title: 'Secretary', aliases: ['Secretary'], headline: 'Every detail.\nEvery connection.', intro: 'Keeps the club connected through clear communication, organised records, and the coordination that helps each initiative run smoothly.', focus: ['Communication', 'Organisation', 'Continuity'] },
  { id: 'tech-lead', title: 'Tech Lead', aliases: ['Tech Lead', 'Technical Lead'], headline: 'Big ideas.\nThoughtful engineering.', intro: 'Guides the technical direction of our work, brings builders together, and helps the team turn ambitious ideas into practical projects.', focus: ['Engineering', 'Mentorship', 'Building'] },
  { id: 'aiml-lead', title: 'AI & ML Lead', aliases: ['AI & ML Lead', 'AIML Lead', 'AI/ML Lead', 'AI and Machine Learning Lead'], headline: 'Curiosity meets\nintelligence.', intro: 'Helps our AI and machine learning community explore models, ask better questions, and learn through experiments and shared discovery.', focus: ['Intelligence', 'Research', 'Experiments'] },
  { id: 'dev-lead', title: 'Dev Lead', aliases: ['Dev Lead', 'Development Lead', 'Web Development Lead'], headline: 'From the first line\nto the real world.', intro: 'Connects design with development, guides collaborative builds, and helps members create useful digital experiences from the ground up.', focus: ['Design', 'Development', 'Shipping'] },
  { id: 'dsa-lead', title: 'DSA Lead', aliases: ['DSA Lead', 'Data Structures and Algorithms Lead'], headline: 'Find the pattern.\nBuild the solution.', intro: 'Helps members strengthen their problem-solving foundations through algorithms, peer practice, and conversations about how and why a solution works.', focus: ['Logic', 'Algorithms', 'Practice'] },
  { id: 'system-design-lead', title: 'System Design Lead', aliases: ['System Design Lead', 'Systems Design Lead'], headline: 'Seeing how\nit all connects.', intro: 'Guides exploration of architecture, connected services, and the trade-offs behind reliable systems, from a simple sketch to the bigger picture.', focus: ['Architecture', 'Scale', 'Reliability'] },
  { id: 'treasurer', title: 'Treasurer', aliases: ['Treasurer'], headline: 'Making possibility\npractical.', intro: 'Looks after the club’s finances, helps plan resources responsibly, and supports the decisions that make our activities possible.', focus: ['Resources', 'Planning', 'Accountability'] },
  { id: 'plan-strategy-lead', title: 'Plan & Strategy Lead', aliases: ['Plan & Strategy Lead', 'Planning and Strategy Lead', 'Plan and Strategy Lead'], headline: 'A little foresight.\nA bigger impact.', intro: 'Connects today’s ideas with tomorrow’s opportunities, shapes action plans, and helps the team move towards clear, achievable goals.', focus: ['Strategy', 'Planning', 'Direction'] },
  { id: 'media-lead', title: 'Media Lead', aliases: ['Media Lead'], headline: 'Every spark\nhas a story.', intro: 'Helps tell the Nucleus story through visuals, updates, and the moments we share, connecting what happens inside the club with the wider community.', focus: ['Storytelling', 'Visuals', 'Connection'] },
  { id: 'discipline-head', title: 'Discipline Head', aliases: ['Discipline Head', 'Discipline Lead'], headline: 'A space where\neveryone belongs.', intro: 'Helps maintain a respectful, welcoming environment and supports the shared standards that allow every member to learn and contribute.', focus: ['Respect', 'Responsibility', 'Belonging'] },
] as const;

const normaliseRole = (role: string) => role.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export function organiseTeam(team: Member[]) {
  const core = coreRoles.map(role => ({
    ...role,
    people: team.filter(member => role.aliases.some(alias => normaliseRole(alias) === normaliseRole(member.role))),
  }));
  const coreIds = new Set(core.flatMap(role => role.people.map(member => member.id)));
  return { core, members: team.filter(member => !coreIds.has(member.id)) };
}

export function memberIntroduction(member: Member) {
  if (member.bio?.trim()) return member.bio.trim();
  if (normaliseRole(member.role) === 'eventlead') {
    return `${member.name} is part of Nucleus as our Event Lead. This role brings people together through club experiences, coordinating the details that turn a shared idea into a gathering of curious minds.`;
  }
  return `${member.name} is part of the Nucleus community at St. Joseph Engineering College, Mangaluru${normaliseRole(member.role) === 'member' ? '' : ` as ${member.role}`}. Our members are at the heart of the club: a space to exchange ideas, learn together, and contribute to what we build next.`;
}
