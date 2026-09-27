import type { ClubMember, CoreMember } from './types';

// Demonstration data only: replace these fictional names and stock portraits
// with the club's approved directory. The existing API directory is unchanged.
export const exampleCore: CoreMember[] = [
  { id: 'aarav', name: 'Aarav Menon', role: 'President', image: '/team/portrait-1.jpg', bio: 'Connecting curious minds and giving ambitious ideas a place to begin.' },
  { id: 'ananya', name: 'Ananya Rao', role: 'Vice President', image: '/team/portrait-2.jpg', bio: 'A little structure, a lot of possibility. Making room for everyone to grow.' },
  { id: 'ishaan', name: 'Ishaan Shah', role: 'Tech Lead', image: '/team/portrait-3.jpg', bio: 'Turning late-night what-ifs into things people can actually use.' },
  { id: 'diya', name: 'Diya Nair', role: 'Design Lead', image: '/team/portrait-4.jpg', bio: 'Finding the feeling behind the interface, one thoughtful detail at a time.' },
  { id: 'rohan', name: 'Rohan D’Souza', role: 'Events Lead', image: '/team/portrait-5.jpg', bio: 'Building experiences that start conversations and turn strangers into friends.' },
  { id: 'meera', name: 'Meera Iyer', role: 'Outreach Lead', image: '/team/portrait-6.jpg', bio: 'Good things happen when the right people find each other.' },
  { id: 'kabir', name: 'Kabir Das', role: 'Content Lead', image: '/team/portrait-7.jpg', bio: 'Collecting the stories, small discoveries, and big moments that make us Nucleus.' },
  { id: 'tara', name: 'Tara Shetty', role: 'Operations Lead', image: '/team/portrait-8.jpg', bio: 'Taking care of the details so the whole community can keep moving.' },
];

const groups = [
  { team: 'Tech', role: 'Developer', names: ['Aditya Bhat', 'Nisha Fernandes', 'Arjun Kumar', 'Sana Ali', 'Vikram Pai'] },
  { team: 'Design', role: 'Designer', names: ['Aisha Khan', 'Devika Jain', 'Neel Rao', 'Riya Thomas', 'Yash Hegde'] },
  { team: 'Events', role: 'Event Coordinator', names: ['Akash Shetty', 'Ira D’Souza', 'Kiran Prabhu', 'Maya Joseph', 'Pranav Nair'] },
  { team: 'Outreach', role: 'Community Partner', names: ['Anika Das', 'Dhruv Menon', 'Lena Rodrigues', 'Omar Ahmed', 'Sia Kamath'] },
  { team: 'Content', role: 'Storyteller', names: ['Avni Shah', 'Joel Pinto', 'Kiara D’Costa', 'Rahul Iyer', 'Zoya Malik'] },
  { team: 'Ops', role: 'Operations', names: ['Aditi Shenoy', 'Ethan D’Souza', 'Lavanya Rao', 'Rehan Khan', 'Tanvi Bhat'] },
];
export const exampleMembers: ClubMember[] = groups.flatMap((group, groupIndex) => group.names.map((name, index) => ({
  id: `${group.team.toLowerCase()}-${index + 1}`, name, role: group.role, team: group.team,
  image: `/team/portrait-${(groupIndex * 5 + index) % 8 + 1}.jpg`,
})));
