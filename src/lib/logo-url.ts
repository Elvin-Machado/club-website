import logoUrlRaw from '../assets/NucleusLogo_transparent.png';

/**
 * Next.js/Turbopack resolves static asset imports differently per context:
 * - a plain URL string (client bundles)
 * - a `{ default: url }` wrapper
 * - a structured image object `{ src, width, height, dataUrl }` (SSR)
 * This helper normalises every shape to a plain, usable URL string.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const raw: any = logoUrlRaw;

export const LOGO_URL: string =
  typeof raw === 'string' && raw
    ? raw
    : raw && typeof raw === 'object'
      ? raw.src || (raw.default as string | undefined) || ''
      : '';
