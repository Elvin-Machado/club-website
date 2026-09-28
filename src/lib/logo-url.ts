import logoUrlRaw from '../assets/NucleusLogo_transparent.png';

/**
 * Next.js wraps static asset imports in `{ default: url }` while Vite returns
 * the plain URL string.  This helper normalises the value so the rest of the
 * codebase can use it as a plain string.
 */
export const LOGO_URL: string =
  typeof logoUrlRaw === 'string' ? logoUrlRaw : (logoUrlRaw as unknown as { default: string }).default;

if (typeof window !== 'undefined') {
  console.log('[logo-url] raw type:', typeof logoUrlRaw, 'keys:', Object.keys(logoUrlRaw as unknown as object), 'str:', JSON.stringify(logoUrlRaw).substring(0, 200));
}
