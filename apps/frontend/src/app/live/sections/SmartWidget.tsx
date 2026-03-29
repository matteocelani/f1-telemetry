'use client';

import { BarChart3, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaceRadar } from '@/app/live/sections/PaceRadar';
import { StrategyTimeline } from '@/app/live/sections/StrategyTimeline';
import { RACE_SESSION_TYPES } from '@/modules/timing/constants';
import { useSession } from '@/store/session';

interface SmartWidgetProps {
  className?: string;
  hideTitle?: boolean;
}

export function SmartWidget({ className, hideTitle }: SmartWidgetProps) {
  const sessionType = useSession((s) => s.sessionInfo?.Type);

  const isRace = RACE_SESSION_TYPES.includes(
    sessionType as (typeof RACE_SESSION_TYPES)[number]
  );

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {!hideTitle && (
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
          {isRace ? (
            <>
              <BarChart3 className="size-3 text-foreground" />
              <span className="text-2xs font-bold uppercase tracking-widest text-foreground">
                Strategy
              </span>
            </>
          ) : (
            <>
              <Gauge className="size-3 text-foreground" />
              <span className="text-2xs font-bold uppercase tracking-widest text-foreground">
                Pace Radar
              </span>
            </>
          )}
        </div>
      )}

      {isRace ? (
        <StrategyTimeline className="flex-1 min-h-0" />
      ) : (
        <PaceRadar className="flex-1 min-h-0" />
      )}
    </div>
  );
}
