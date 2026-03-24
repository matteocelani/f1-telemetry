'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import type { RaceEntry } from '@/types/data';
import { RaceCard } from '@/app/calendar/components/RaceCard';
import calendarData from '@/data/calendar.json';

const races = calendarData as unknown as RaceEntry[];

// Animation Variants

const containerVariant: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariant: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function CalendarPage() {
  const [isClient, setIsClient] = useState(false);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Identify the upcoming event based on current time.
  const nextRaceId = useMemo(() => {
    const next = races.find((race) => new Date(race.sessions.race) >= now);
    return next?.id || null;
  }, [now]);

  return (
    <div className="flex min-h-dvh flex-col bg-background selection:bg-foreground/10 text-foreground font-sans relative">
      {/* Background Decorative Patterns */}
      <div className="fixed inset-0 z-0 bg-dot-pattern opacity-10 dark:opacity-15 pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-dashboard-glow pointer-events-none" />

      <main className="z-10 flex flex-col p-6 md:p-12 w-full max-w-6xl mx-auto flex-1">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <Button
            asChild
            variant="ghost"
            className="mb-8 -ml-4 text-muted-foreground hover:text-foreground hover:bg-transparent flex w-fit gap-2 transition-colors"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="flex flex-col gap-2">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              2026 Calendar
            </h1>
            <p className="text-muted-foreground font-medium max-w-2xl">
              Complete schedule for the 2026 FIA Formula One World Championship.
              Follow every session from practice to the grand prix.
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariant}
          initial="hidden"
          animate="visible"
          className="grid gap-6 md:grid-cols-2"
        >
          {races.map((race) => (
            <RaceCard
              key={race.id}
              race={race}
              isPast={new Date(race.sessions.race) < now}
              isNext={race.id === nextRaceId}
              isClient={isClient}
              variants={itemVariant}
            />
          ))}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
