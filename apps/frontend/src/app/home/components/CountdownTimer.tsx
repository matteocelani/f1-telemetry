'use client';

import { useState, useEffect } from 'react';
import {
  MS_PER_SECOND,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  SECONDS_PER_MINUTE,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
} from '@/constants/numbers';
import { cn } from '@/lib/utils';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  targetDate: Date;
  onTimerZero?: () => void;
  className?: string;
}

export function CountdownTimer({
  targetDate,
  onTimerZero,
  className,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft | null => {
      const difference = targetDate.getTime() - new Date().getTime();

      if (difference <= 0) {
        return null; // Time is up
      }

      return {
        days: Math.floor(difference / MS_PER_DAY),
        hours: Math.floor((difference / MS_PER_HOUR) % HOURS_PER_DAY),
        minutes: Math.floor((difference / MS_PER_MINUTE) % MINUTES_PER_HOUR),
        seconds: Math.floor((difference / MS_PER_SECOND) % SECONDS_PER_MINUTE),
      };
    };

    // Calculate immediately on mount
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (!newTimeLeft && onTimerZero) {
        onTimerZero();
        clearInterval(timer);
      }
    }, MS_PER_SECOND);

    return () => clearInterval(timer);
  }, [targetDate, onTimerZero]);

  // Minimal SaaS Style - No red glows, clean tabular nums, sans-serif labels
  if (timeLeft === null) {
    return (
      <div className={cn('flex items-center gap-4 sm:gap-6', className)}>
        {['Days', 'Hours', 'Mins', 'Secs'].map((label) => (
          <div key={label} className="flex flex-col items-center">
            <span className="text-3xl sm:text-4xl md:text-5xl font-medium tabular-nums text-foreground/20">
              00
            </span>
            <span className="text-xs sm:text-xs font-medium uppercase tracking-widest text-muted-foreground/50 mt-1">
              {label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  const timeBlocks = [
    { label: 'Days', value: formatNumber(timeLeft.days) },
    { label: 'Hours', value: formatNumber(timeLeft.hours) },
    { label: 'Mins', value: formatNumber(timeLeft.minutes) },
    { label: 'Secs', value: formatNumber(timeLeft.seconds) },
  ];

  return (
    <div className={cn('flex items-center gap-4 sm:gap-6', className)}>
      {timeBlocks.map((block, i) => (
        <div key={block.label} className="flex items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-center transition-opacity duration-300">
            <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-light tabular-nums tracking-tight text-foreground">
              {block.value}
            </span>
            <span className="text-xs sm:text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">
              {block.label}
            </span>
          </div>
          {i !== timeBlocks.length - 1 && (
            <span className="text-xl sm:text-2xl font-light text-muted-foreground/30 -mt-5">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
