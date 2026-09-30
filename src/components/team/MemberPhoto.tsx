'use client';

import { useState } from 'react';

export default function MemberPhoto({ src, name, sizes, priority = false }: { src?: string; name: string; sizes: string; priority?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const showImage = Boolean(src && src !== failedSrc);
  return <>
    {showImage ? (
      <img src={src} alt={`Portrait of ${name}`} sizes={sizes} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" className="member-photo" onError={() => setFailedSrc(src)} />
    ) : (
      <span className="member-photo-initials" aria-hidden="true">{name.split(' ').map(word => word[0]).slice(0, 2).join('')}</span>
    )}
  </>;
}
