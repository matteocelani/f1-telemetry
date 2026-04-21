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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface SyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Refresh the "stream history available" hint while the modal is open.
const POLL_INTERVAL_MS = MS_PER_SECOND;

function formatStreamHistory(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const remaining = seconds % SECONDS_PER_MINUTE;
  return minutes === 0 ? `${remaining}s` : `${minutes}m ${remaining}s`;
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
    const id = setInterval(read, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [open]);

  // Reset the local draft to the persisted delay whenever the modal reopens.
  useEffect(() => {
    if (open) setDraft(currentDelay);
  }, [open, currentDelay]);

  const sliderMax = Math.min(MAX_DELAY_SECONDS, maxAvailable);
  const hasStream = maxAvailable > 0;
  const isDraftChanged = draft !== currentDelay;

  const handleApply = () => {
    setDelay(draft);
  };

  const handleGoLive = () => {
    goLive();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Broadcast Sync</DialogTitle>
          <DialogDescription>
            Delay the dashboard to match your TV broadcast.
          </DialogDescription>
        </DialogHeader>

        {hasStream ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sync-delay-input">Delay (seconds)</Label>
              <Input
                id="sync-delay-input"
                type="number"
                min={0}
                max={sliderMax}
                value={draft}
                onChange={(e) => setDraft(Number(e.target.value))}
              />
            </div>
            <Slider
              min={0}
              max={sliderMax}
              step={1}
              value={[draft]}
              onValueChange={(v: number[]) => setDraft(v[0] ?? 0)}
            />
            <p className="text-xs text-muted-foreground">
              Stream history available: {formatStreamHistory(maxAvailable)}
            </p>
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
            variant="default"
            onClick={handleApply}
            disabled={!hasStream || !isDraftChanged}
            aria-label="Apply delay"
          >
            Apply
          </Button>
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
