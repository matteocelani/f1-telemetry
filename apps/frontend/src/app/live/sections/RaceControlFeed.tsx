'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RaceControlMessage } from '@/app/live/components/RaceControlMessage';
import { ROW_EXPAND_DURATION } from '@/constants/numbers';
import { useRaceControlFeed } from '@/modules/timing/hooks/useRaceControlFeed';

interface RaceControlFeedProps {
  className?: string;
  hideTitle?: boolean;
}

export function RaceControlFeed({
  className,
  hideTitle,
}: RaceControlFeedProps) {
  const messages = useRaceControlFeed();
  const hasMessages = messages.length > 0;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {!hideTitle && (
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
          <Radio className="size-3 text-foreground" />
          <span className="text-2xs font-bold uppercase tracking-widest text-foreground">
            Race Control
          </span>
          {hasMessages && (
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-2xs font-bold tabular-nums text-foreground">
              {messages.length}
            </span>
          )}
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto"
        role="log"
        aria-label="Race control messages"
      >
        {hasMessages ? (
          <div className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: ROW_EXPAND_DURATION }}
                  className="overflow-hidden"
                >
                  <RaceControlMessage message={msg} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <Radio className="size-5 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No messages yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
