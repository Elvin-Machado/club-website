'use client';

import dynamic from 'next/dynamic';

const ExistingSite = dynamic(() => import('./ExistingSite'), { ssr: false, loading: () => <main className="page-loading" /> });

export default function ExistingSiteClient({ admin }: { admin: boolean }) {
  return <ExistingSite admin={admin} />;
}
