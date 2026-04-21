'use client';

import { useEffect, useState } from 'react';
import { Hourglass } from 'lucide-react';
import { MS_PER_SECOND, SECONDS_PER_MINUTE } from '@/constants/numbers';
import { MAX_DELAY_SECONDS, useSync } from '@/store/sync';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface SyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Produces human-readable durations ("1 minute 30 seconds") because bare numbers confuse non-technical users.
function formatDelay(seconds: number): string {
  if (seconds === 0) return 'Live';
  if (seconds < SECONDS_PER_MINUTE) {
    return seconds === 1 ? '1 second' : `${seconds} seconds`;
  }
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const remaining = seconds % SECONDS_PER_MINUTE;
  const minPart = minutes === 1 ? '1 minute' : `${minutes} minutes`;
  if (remaining === 0) return minPart;
  const secPart = remaining === 1 ? '1 second' : `${remaining} seconds`;
  return `${minPart} ${secPart}`;
}

export function SyncModal({ open, onOpenChange }: SyncModalProps) {
  const currentDelay = useSync((s) => s.delaySeconds);
  const setDelay = useSync((s) => s.setDelay);
  const goLive = useSync((s) => s.goLive);

  const [draft, setDraft] = useState<number>(currentDelay);
  const [maxAvailable, setMaxAvailable] = useState<number>(0);

  // Poll getMaxDelaySeconds each second while open; the buffer does not push updates via Zustand.
  useEffect(() => {
    if (!open) return;
    const read = () => setMaxAvailable(useSync.getState().getMaxDelaySeconds());
    read();
    const id = setInterval(read, MS_PER_SECOND);
    return () => clearInterval(id);
  }, [open]);

  // Reset the local draft to the persisted delay whenever the modal reopens.
  useEffect(() => {
    if (open) setDraft(currentDelay);
  }, [open, currentDelay]);

  const sliderMax = Math.min(MAX_DELAY_SECONDS, maxAvailable);
  const hasStream = maxAvailable > 0;
  const isDraftLive = draft === 0;

  const handleGoLive = () => {
    goLive();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Broadcast Delay</DialogTitle>
          <DialogDescription>
            Hold back the dashboard so it stays in sync with your broadcast.
          </DialogDescription>
        </DialogHeader>

        {hasStream ? (
          <div className="flex flex-col gap-6 py-4">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isDraftLive ? 'Currently' : 'Showing events from'}
              </p>
              <p
                className={cn(
                  'mt-1 text-xl font-bold tabular-nums sm:text-3xl',
                  isDraftLive ? 'text-emerald-500' : 'text-yellow-500'
                )}
              >
                {isDraftLive ? 'Live' : `${formatDelay(draft)} ago`}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Slider
                min={0}
                max={sliderMax}
                step={1}
                value={[draft]}
                onValueChange={(v: number[]) => setDraft(v[0])}
                onValueCommit={(v: number[]) => setDelay(v[0])}
                aria-label="Broadcast delay"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Live</span>
                <span>up to {formatDelay(sliderMax)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Hourglass className="size-5 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">
              Waiting for stream...
            </p>
            <p className="text-xs text-muted-foreground">
              Once data starts flowing, you&apos;ll be able to set a delay here.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleGoLive}
            disabled={currentDelay === 0}
            aria-label="Go to live"
          >
            Go Live
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
