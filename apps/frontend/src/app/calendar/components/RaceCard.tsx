'use client';

import { motion, Variants } from 'framer-motion';
import { Calendar as CalendarIcon, MapPin, Sparkles } from 'lucide-react';
import type { RaceEntry } from '@/types/data';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface RaceCardProps {
  race: RaceEntry;
  isPast: boolean;
  isNext: boolean;
  isClient: boolean;
  variants: Variants;
}

// Logic Helpers

function getDateRange(sessions: Record<string, string>): string {
  const dates = Object.values(sessions)
    .map((s) => new Date(s))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return '';

  const first = dates[0];
  const last = dates[dates.length - 1];
  const month = last.toLocaleDateString('en-US', { month: 'short' });

  // Handle month transition within the weekend.
  if (first.getMonth() !== last.getMonth()) {
    const startMonth = first.toLocaleDateString('en-US', { month: 'short' });
    return `${first.getDate()} ${startMonth} - ${last.getDate()} ${month}`;
  }

  return `${first.getDate()} - ${last.getDate()} ${month}`;
}

export function RaceCard({
  race,
  isPast,
  isNext,
  isClient,
  variants,
}: RaceCardProps) {
  const dateRange = getDateRange(race.sessions);

  return (
    <motion.div
      variants={variants}
      className={cn(
        'group relative flex flex-col p-6 rounded-2xl border transition-all duration-500',
        isNext &&
          'border-foreground bg-card/80 shadow-2xl ring-1 ring-foreground/20 scale-105 z-20',
        isPast &&
          'border-border/20 bg-muted opacity-80 grayscale hover:opacity-100 hover:grayscale-0',
        !isPast &&
          !isNext &&
          'border-border/60 bg-card/60 backdrop-blur-sm hover:border-foreground/30 hover:bg-card/80 shadow-sm'
      )}
    >
      {/* Visual indicator for the upcoming race. */}
      {isNext && (
        <div className="absolute -top-3 left-6 z-30">
          <Badge className="bg-foreground text-background px-3 py-1 text-xs font-bold tracking-widest uppercase border-none shadow-lg gap-1.5 animate-in fade-in slide-in-from-top-2 duration-500">
            <Sparkles className="h-3 w-3 fill-current" />
            Next Event
          </Badge>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'px-2 py-0.5 text-xs font-bold tracking-wider uppercase rounded-md border-border/50',
              isPast ? 'bg-muted/10' : 'bg-foreground/5',
              isNext && 'border-foreground/20 bg-foreground/10'
            )}
          >
            Round {race.round}
          </Badge>
          {race.isSprint && (
            <Badge
              variant="outline"
              className="px-2 py-0.5 text-xs font-bold tracking-wider uppercase rounded-md border-f1-sector-purple/30 bg-f1-sector-purple/10 text-f1-sector-purple"
            >
              Sprint
            </Badge>
          )}
        </div>
        <span
          className={cn(
            'text-2xl leading-none transition-transform duration-500 group-hover:scale-110',
            isPast ? 'grayscale' : 'grayscale-0'
          )}
        >
          {race.countryFlag}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        <h2
          className={cn(
            'text-xl font-bold tracking-tight leading-tight transition-colors duration-300',
            isNext
              ? 'text-foreground'
              : 'text-foreground/90 group-hover:text-foreground'
          )}
        >
          {race.name.replace('FORMULA 1', '').trim()}
        </h2>
        <div className="flex items-center gap-1.5 text-muted-foreground/80">
          <MapPin className="h-3.5 w-3.5 opacity-60" />
          <p className="text-sm font-medium">
            {race.location}, {race.country}
          </p>
        </div>
      </div>

      <Separator
        className={cn(
          'my-5 transition-colors duration-500',
          isNext ? 'bg-foreground/20' : 'bg-border/40'
        )}
      />

      <div className="flex items-center justify-between mt-auto">
        <div
          className={cn(
            'flex items-center gap-2 transition-colors duration-500',
            isNext ? 'text-foreground' : 'text-foreground/70'
          )}
        >
          <CalendarIcon className="h-4 w-4 opacity-60" />
          <span className="text-sm font-bold tracking-tight">
            {isClient ? dateRange : '...'}
          </span>
        </div>

        {!isPast && (
          <div
            className={cn(
              'flex h-1.5 w-1.5 rounded-full transition-all duration-500',
              isNext
                ? 'bg-foreground scale-125 shadow-sm'
                : 'bg-foreground/20 group-hover:bg-foreground/40'
            )}
          />
        )}
      </div>
    </motion.div>
  );
}
