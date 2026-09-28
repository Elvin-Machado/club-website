import { LOGO_URL } from '../../lib/logo-url';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg className={`brand-mark ${className}`} viewBox="430 128 672 625" aria-hidden="true" width="56" height="56">
      <image href={LOGO_URL} width="1599" height="899" />
    </svg>
  );
}

export default Logo;
