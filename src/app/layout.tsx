import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Nucleus — Where curious minds connect', template: '%s | Nucleus SJEC' },
  description: 'A student innovation community at St. Joseph Engineering College, Mangaluru. Many minds. One Nucleus.',
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { themeColor: '#000000' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
