'use client';

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { CircuitSvg } from '@/app/home/components/CircuitSvg';
import { CountdownTimer } from '@/app/home/components/CountdownTimer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const sessionLabels: Record<string, string> = {
  fp1: 'Practice 1',
  fp2: 'Practice 2',
  fp3: 'Practice 3',
  sprintQualy: 'Sprint Shootout',
  sprint: 'Sprint',
  qualy: 'Qualifying',
  race: 'Race',
};

const containerVariant: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

interface RaceEntry {
  id: string;
  name: string;
  location: string;
  country: string;
  countryFlag: string;
  circuitName: string;
  round: number;
  isSprint: boolean;
  sessions: Record<string, string>;
}

interface CircuitInfo {
  circuitId: string;
  path: string;
  viewBox: string;
}

interface HeroProps {
  currentGp: RaceEntry;
  targetDate: Date;
  nextSession: [string, string] | undefined;
  isLiveActive: boolean;
  isClient: boolean;
  circuitInfo?: CircuitInfo;
}

export function Hero({
  currentGp,
  targetDate,
  nextSession,
  isLiveActive,
  isClient,
  circuitInfo,
}: HeroProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center w-full min-h-dvh"
      variants={containerVariant}
      initial="hidden"
      animate="visible"
    >
      {/* Header Minimal Logo */}
      <motion.div
        variants={itemVariant}
        className="flex flex-col items-center mb-10 lg:mb-12"
      >
        <h2 className="text-xl md:text-2xl font-light tracking-tight flex gap-2 text-muted-foreground">
          <span className="font-semibold text-foreground">F1</span>
          <span className="tracking-widest opacity-80 uppercase">
            Telemetry
          </span>
        </h2>
      </motion.div>

      {/* Hero Event Title */}
      <motion.div
        variants={itemVariant}
        className="flex flex-col items-center gap-4 text-center w-full"
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-foreground/20 bg-foreground/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground rounded-full backdrop-blur-md shadow-sm"
          >
            Round {currentGp.round}
          </Badge>
          {currentGp.isSprint && (
            <Badge
              variant="outline"
              className="border-f1-sector-purple/40 bg-f1-sector-purple/15 px-4 py-1.5 text-xs font-semibold tracking-wide text-f1-sector-purple rounded-full backdrop-blur-md shadow-sm"
            >
              Sprint Weekend
            </Badge>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-balance max-w-4xl leading-tight">
          {currentGp.name.includes('FORMULA 1') ? (
            <>
              <span className="whitespace-nowrap">FORMULA 1</span>{' '}
              {currentGp.name
                .replace('FORMULA 1', '')
                .trim()
                .split(' ')
                .slice(0, -1)
                .join(' ')}
            </>
          ) : (
            currentGp.name.split(' ').slice(0, -1).join(' ')
          )}{' '}
          <br className="hidden md:block" />
          <span className="text-foreground/70 font-light">
            {currentGp.name.split(' ').pop()}
          </span>{' '}
          <span className="opacity-100">{currentGp.countryFlag}</span>
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground font-medium tracking-wide">
          {currentGp.circuitName}
        </p>
      </motion.div>

      {/* Circuit SVG */}
      {circuitInfo && (
        <motion.div
          variants={itemVariant}
          className="w-full flex justify-center my-8 md:my-10"
        >
          <CircuitSvg path={circuitInfo.path} viewBox={circuitInfo.viewBox} />
        </motion.div>
      )}

      {/* Countdown */}
      <motion.div
        variants={itemVariant}
        className="w-full flex flex-col items-center justify-center my-8 md:my-10 min-h-20"
      >
        {isClient ? (
          <div className="flex flex-col items-center gap-4">
            <CountdownTimer targetDate={targetDate} />
            {nextSession && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/40 bg-foreground/5 text-xs font-medium tracking-wide text-muted-foreground">
                <span>Next Session:</span>
                <span className="text-foreground">
                  {sessionLabels[nextSession[0]] || nextSession[0]}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="h-16 w-72 animate-pulse rounded-md bg-muted/20" />
        )}
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        variants={itemVariant}
        className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-sm sm:max-w-none"
      >
        <Button
          asChild
          variant="outline"
          className="h-12 w-full sm:w-48 rounded-full border-border/60 bg-card shadow-sm font-medium tracking-wide hover:bg-accent hover:text-accent-foreground hover:border-foreground/30 transition-all backdrop-blur-md"
        >
          <Link href="/calendar">View Full Calendar</Link>
        </Button>

        {isLiveActive ? (
          <Button
            asChild
            className="h-12 w-full sm:w-48 rounded-full bg-foreground text-background font-medium tracking-wide hover:bg-foreground/90 transition-all shadow-lg hover:scale-[1.02]"
          >
            <Link href="/live">Enter Live Session</Link>
          </Button>
        ) : (
          <div className="relative group w-full sm:w-48 cursor-not-allowed">
            <button
              type="button"
              className="h-12 w-full rounded-full bg-secondary border border-border text-muted-foreground font-medium tracking-wide cursor-not-allowed opacity-100 shadow-inner hover:bg-secondary pointer-events-none transition-colors"
              disabled
            >
              Enter Live Session
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-popover border border-border shadow-md rounded-md text-xs tracking-wide font-medium text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              Opens 1h before session
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
