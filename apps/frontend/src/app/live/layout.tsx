'use client';

import { ReactNode } from 'react';

/**
 * Live layout intentionally strips all standard navigation/chrome.
 * Full-screen liquid layout for the pit-wall experience.
 */
export default function LiveLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh w-screen overflow-hidden bg-background text-foreground relative font-sans">
      {/* Background Decorative Patterns (Consistent with Home/Calendar) */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] bg-size-(--spacing-dot-pattern) opacity-10 dark:opacity-15 pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-dashboard-glow opacity-50 pointer-events-none" />

      <div className="relative z-10 h-full w-full flex flex-col">
        {children}
      </div>
    </div>
  );
}
