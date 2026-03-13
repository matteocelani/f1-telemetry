'use client';

import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { useRaceControl } from '@/store/race-control';

interface RaceControlFeedProps {
  className?: string;
}

export function RaceControlFeed({ className }: RaceControlFeedProps) {
  const messages = useRaceControl(useShallow((s) => s.messages));

  return (
    <div
      className={cn(
        'flex flex-col gap-2 overflow-y-auto scrollbar-thin p-2',
        className
      )}
    >
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
            No active messages
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {messages.map((msg, idx) => (
            <div
              key={`${msg.Utc}-${idx}`}
              className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/40 p-3 transition-colors hover:bg-card/60"
            >
              <div className="flex h-5 w-8 shrink-0 items-center justify-center rounded bg-foreground/5 text-xs font-bold tabular-nums text-muted-foreground">
                {msg.Lap ? `L${msg.Lap}` : '—'}
              </div>
              <p className="text-xs leading-relaxed text-foreground/90">
                {msg.Message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
