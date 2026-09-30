import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nucleussjec.in';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Nucleus — Where curious minds connect', template: '%s | Nucleus SJEC' },
  description: 'A student innovation community at St. Joseph Engineering College, Mangaluru. Many minds. One Nucleus.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Nucleus SJEC',
    title: 'Nucleus — Where curious minds connect',
    description: 'A student innovation community at St. Joseph Engineering College, Mangaluru. Many minds. One Nucleus.',
    images: [
      {
        url: '/social-card.png',
        width: 1200,
        height: 630,
        alt: 'Nucleus — Where curious minds connect',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nucleus — Where curious minds connect',
    description: 'A student innovation community at St. Joseph Engineering College, Mangaluru.',
    images: ['/social-card.png'],
  },
};
export const viewport: Viewport = { themeColor: '#080d12' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
