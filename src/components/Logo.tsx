const logoUrl = '/NucleusLogo_transparent.png';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg className={`brand-mark ${className}`} viewBox="430 128 672 625" aria-hidden="true" width="56" height="56">
      <image href={logoUrl} width="1599" height="899" />
    </svg>
  );
}
