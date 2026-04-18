'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, Radio } from 'lucide-react';
import { RaceControlMessage } from '@/app/live/components/RaceControlMessage';
import { ROW_EXPAND_DURATION } from '@/constants/numbers';
import { useDriverLookup } from '@/modules/timing/hooks/useDriverLookup';
import { useRaceControlFeed } from '@/modules/timing/hooks/useRaceControlFeed';
import { cn } from '@/lib/utils';

// Distance from top (px) to consider the user "at the newest message".
const AUTO_SCROLL_THRESHOLD = 60;

interface RaceControlFeedProps {
  className?: string;
  hideTitle?: boolean;
}

export function RaceControlFeed({
  className,
  hideTitle,
}: RaceControlFeedProps) {
  const messages = useRaceControlFeed();
  const driverMap = useDriverLookup();
  const hasMessages = messages.length > 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserScrolled, setIsUserScrolled] = useState(false);

  // Track whether the user has scrolled away from the newest messages.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setIsUserScrolled(el.scrollTop > AUTO_SCROLL_THRESHOLD);
  }, []);

  // Auto-scroll to top (newest) when new messages arrive, unless user scrolled away.
  useEffect(() => {
    if (isUserScrolled || !scrollRef.current) return;
    scrollRef.current.scrollTo({ top: 0 });
  }, [messages.length, isUserScrolled]);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setIsUserScrolled(false);
  }, []);

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

      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto"
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
                    <RaceControlMessage message={msg} driverMap={driverMap} />
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

        {isUserScrolled && hasMessages && (
          <button
            type="button"
            onClick={scrollToTop}
            className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground/90 px-3 py-1 text-2xs font-bold text-background shadow-lg transition-colors hover:bg-foreground"
          >
            <ArrowDown className="size-3 rotate-180" />
            Latest
          </button>
        )}
      </div>
    </div>
  );
}
