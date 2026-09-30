'use client';

import { useState } from 'react';

export default function MemberPhoto({ src, name, sizes, priority = false }: { src?: string; name: string; sizes: string; priority?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const showImage = Boolean(src && src !== failedSrc);
  const srcSet = src && src.endsWith('.avif') && !src.includes('-400')
    ? `${src.replace(/\.avif$/, '-400.avif')} 400w, ${src} 800w`
    : undefined;
  return <>
    {showImage ? (
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={`Portrait of ${name}`}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding={priority ? 'sync' : 'async'}
        className="member-photo"
        onError={() => setFailedSrc(src)}
      />
    ) : (
      <span className="member-photo-initials" aria-hidden="true">{name.split(' ').map(word => word[0]).slice(0, 2).join('')}</span>
    )}
  </>;
}
