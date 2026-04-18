'use client';

import { ReactNode } from 'react';
import { LiveTimingProvider } from '@/modules/timing/Context';
import { Toaster } from '@/components/ui/sonner';

// Full-screen pit-wall layout with WS lifecycle and toast notifications.
export default function LiveLayout({ children }: { children: ReactNode }) {
  return (
    <LiveTimingProvider>
      <div className="h-dvh w-screen overflow-hidden bg-background text-foreground font-sans">
        <div className="h-full w-full flex flex-col">{children}</div>
        <Toaster position="top-center" />
      </div>
    </LiveTimingProvider>
  );
}
