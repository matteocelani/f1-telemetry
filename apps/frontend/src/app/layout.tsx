import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { Providers } from '@/app/providers';
import '@/assets/css/globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const jbMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

const SITE_NAME = 'F1 Telemetry';
const SITE_URL = 'https://f1-telemetry.vercel.app';
const TITLE = 'F1 Telemetry — Real-Time Formula 1 Live Timing Dashboard';
const DESCRIPTION =
  'Open-source real-time Formula 1 telemetry dashboard. Live timing tower, interactive track map, race strategy, tyre analysis and car telemetry. Follow every F1 session live with sector times, gaps, pit stops and driver positions.';
const PREVIEW_IMAGE = `${SITE_URL}/preview.png`;

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    'F1 live timing',
    'Formula 1 telemetry',
    'F1 dashboard',
    'F1 track map live',
    'F1 race strategy',
    'F1 tyre strategy',
    'F1 sector times',
    'F1 pit stop tracker',
    'F1 driver positions live',
    'F1 timing tower',
    'Formula 1 live data',
    'F1 2026 season',
    'F1 telemetry open source',
    'real-time F1 data',
    'F1 gap to leader',
    'F1 race control messages',
  ],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/256.png', sizes: '256x256', type: 'image/png' },
      { url: '/512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/1024.png', sizes: '1024x1024', type: 'image/png' },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: PREVIEW_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [PREVIEW_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jbMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
