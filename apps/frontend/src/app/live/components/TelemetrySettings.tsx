'use client';

import { Info, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TelemetrySeries } from '@/modules/timing/hooks/useTelemetryChart';

interface SeriesOption {
  key: TelemetrySeries;
  label: string;
  description: string;
  color: string;
}

const SERIES_OPTIONS = [
  { key: 'speed', label: 'Speed', description: 'Vehicle speed (km/h)', color: '#3b82f6' },
  { key: 'throttle', label: 'Throttle', description: 'Throttle input (0–100%)', color: '#22c55e' },
  { key: 'brake', label: 'Brake', description: 'Brake pressure (0–100%)', color: '#ef4444' },
  { key: 'rpm', label: 'RPM', description: 'Engine RPM', color: '#f59e0b' },
  { key: 'gear', label: 'Gear', description: 'Current gear (1–8)', color: '#a855f7' },
  { key: 'activeAero', label: 'Aero Mode', description: '0 Corner · 1 Straight · 2 Overtake', color: '#06b6d4' },
] as const satisfies readonly SeriesOption[];

const MAX_VISIBLE_SERIES = 4;

interface TelemetrySettingsProps {
  visible: Set<TelemetrySeries>;
  onToggle: (series: TelemetrySeries) => void;
}

export function TelemetrySettings({ visible, onToggle }: TelemetrySettingsProps) {
  const isAtMax = visible.size >= MAX_VISIBLE_SERIES;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          title="Chart settings"
        >
          <Settings2 className="size-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-sm">Chart Settings</DialogTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-52">
                  Select up to {MAX_VISIBLE_SERIES} series at a time for a
                  cleaner, more readable chart.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {SERIES_OPTIONS.map((opt) => {
            const isActive = visible.has(opt.key);
            const isOnlyOne = isActive && visible.size === 1;
            const isDisabled = !isActive && isAtMax;

            return (
              <button
                key={opt.key}
                type="button"
                disabled={isOnlyOne || isDisabled}
                onClick={() => onToggle(opt.key)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                  isActive
                    ? 'bg-white/5'
                    : 'opacity-50 hover:opacity-75',
                  (isOnlyOne || isDisabled) && 'cursor-not-allowed opacity-30'
                )}
              >
                <div
                  className="size-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: opt.color,
                    opacity: isActive ? 1 : 0.3,
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">{opt.label}</span>
                  <span className="text-2xs text-muted-foreground">{opt.description}</span>
                </div>
                <div className="ml-auto">
                  <div
                    className={cn(
                      'size-4 rounded border-2 transition-colors',
                      isActive
                        ? 'border-foreground bg-foreground'
                        : 'border-muted-foreground'
                    )}
                  >
                    {isActive && (
                      <svg viewBox="0 0 16 16" className="size-full text-background">
                        <path
                          d="M4 8l3 3 5-6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-2xs text-muted-foreground">
          {visible.size}/{MAX_VISIBLE_SERIES} series selected
        </p>
      </DialogContent>
    </Dialog>
  );
}
