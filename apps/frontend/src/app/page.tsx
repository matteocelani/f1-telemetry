'use client';

import { useState, useEffect } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/app/home/sections/Hero';
import { Schedule } from '@/app/home/sections/Schedule';
import type { RaceEntry } from '@/types/data';
import calendarData from '@/data/calendar.json';
import circuitsData from '@/data/circuits.json';

const LIVE_THRESHOLD_MS = 60 * 60 * 1000;

const races = calendarData as unknown as RaceEntry[];

function getCurrentGrandPrix(): RaceEntry {
  const now = new Date();
  const current = races.find((race) => {
    const sessionDates = Object.values(race.sessions).map((s) =>
      new Date(s).getTime()
    );
    const lastSession = new Date(Math.max(...sessionDates));
    return lastSession > now;
  });
  return current || races[races.length - 1];
}

export default function HomePage() {
  const [isClient, setIsClient] = useState(false);
  const currentGp = getCurrentGrandPrix();

  const circuitInfo = circuitsData.find((c) => c.circuitId === currentGp.id);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const sessionEntries = Object.entries(currentGp.sessions).sort(
    (a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime()
  );

  const now = new Date().getTime();
  const nextSession = sessionEntries.find(
    ([, iso]) => new Date(iso).getTime() > now
  );
  const targetDate = nextSession
    ? new Date(nextSession[1])
    : new Date(sessionEntries[sessionEntries.length - 1][1]);

  const isLiveActive = nextSession
    ? targetDate.getTime() - now <= LIVE_THRESHOLD_MS
    : false;

  return (
    <div className="flex min-h-dvh flex-col bg-background selection:bg-foreground/10 text-foreground relative font-sans">
      {/* Fixed Dotted Background */}
      <div className="fixed inset-0 z-0 bg-dot-pattern opacity-10 dark:opacity-15 pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-dashboard-glow pointer-events-none" />

      {/* Hero */}
      <main className="z-10 flex flex-col items-center p-6 md:p-12 w-full max-w-6xl mx-auto">
        <Hero
          currentGp={currentGp}
          targetDate={targetDate}
          nextSession={nextSession}
          isLiveActive={isLiveActive}
          isClient={isClient}
          circuitInfo={circuitInfo}
        />
      </main>

      {/* Schedule */}
      <Schedule sessionEntries={sessionEntries} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
