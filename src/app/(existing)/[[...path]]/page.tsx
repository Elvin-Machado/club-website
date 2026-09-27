import { notFound } from 'next/navigation';
import ExistingSite from '../../../components/ExistingSite';

export async function generateMetadata({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return path[0] === 'admin' ? { title: 'Control room', robots: { index: false, follow: false } } : {};
}

export default async function ExistingPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const pathname = `/${path.join('/')}`;
  if (!['/', '/about', '/events', '/projects', '/admin'].includes(pathname)) notFound();
  return <ExistingSite admin={pathname === '/admin'} />;
}
