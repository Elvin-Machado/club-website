'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function MemberPhoto({ src, name, sizes, priority = false }: { src?: string; name: string; sizes: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <>
    <span className="member-photo-initials" aria-hidden="true">{name.split(' ').map(word => word[0]).slice(0, 2).join('')}</span>
    {src && !failed && <Image src={src} alt={`Portrait of ${name}`} fill sizes={sizes} priority={priority} className="member-photo" onError={() => setFailed(true)} />}
  </>;
}
