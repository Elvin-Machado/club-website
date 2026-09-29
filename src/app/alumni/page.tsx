import type { Metadata } from 'next';
import AlumniShowcase from '../../components/team/AlumniShowcase';

export const metadata: Metadata = {
  title: 'Alumni',
  description: 'Once part of NUCLEUS, always part of the universe. Meet the former members who shaped the club.',
};

export default function AlumniPage() {
  return <AlumniShowcase clubName="Nucleus" />;
}
