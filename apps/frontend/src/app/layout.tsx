import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'F1 Telemetry — Live Dashboard',
  description:
    'Enterprise-grade real-time Formula 1 telemetry, timing and strategy dashboard for the 2026 season.',
  keywords: ['F1', 'telemetry', 'live timing', 'formula 1', '2026'],
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
