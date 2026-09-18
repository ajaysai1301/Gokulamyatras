import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://gokulamyatras.in';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'GokulamYatras — Sacred Journeys, Crafted with Devotion',
    template: '%s · GokulamYatras',
  },
  description:
    'GokulamYatras curates premium, thoughtfully organised pilgrimage journeys across India — Tirupati, Kashi, Shirdi, Char Dham and more. Travel with faith, comfort and trusted coordinators.',
  keywords: ['yatra', 'pilgrimage', 'Tirupati', 'Kashi', 'Char Dham', 'temple tour', 'India spiritual travel'],
  openGraph: {
    title: 'GokulamYatras — Sacred Journeys, Crafted with Devotion',
    description: 'Premium, thoughtfully organised pilgrimage journeys across India.',
    url: BASE_URL,
    siteName: 'GokulamYatras',
    type: 'website',
    locale: 'en_IN',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#D9761E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: 'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);' }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
