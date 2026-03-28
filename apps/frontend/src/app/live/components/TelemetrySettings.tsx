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
import { MAX_VISIBLE_SERIES, TELEMETRY_SERIES_META } from '@/modules/timing/constants';
import type { TelemetrySeries } from '@/modules/timing/types';

type ViewMode = 'hud' | 'trace';

interface TelemetrySettingsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  visible: Set<TelemetrySeries>;
  onToggle: (series: TelemetrySeries) => void;
}

export function TelemetrySettings({
  viewMode,
  onViewModeChange,
  visible,
  onToggle,
}: TelemetrySettingsProps) {
  const isAtMax = visible.size >= MAX_VISIBLE_SERIES;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          title="Telemetry settings"
        >
          <Settings2 className="size-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">Telemetry Settings</DialogTitle>
        </DialogHeader>

        {/* View mode toggle */}
        <div className="flex flex-col gap-1.5">
          <span className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            View Mode
          </span>
          <div className="flex gap-1 rounded-full bg-muted p-0.5">
            {(['hud', 'trace'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex-1 rounded-full py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                  viewMode === mode
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode === 'hud' ? 'Live HUD' : 'Chart Trace'}
              </button>
            ))}
          </div>
        </div>

        {/* Series selection — only relevant in Trace */}
        <div
          className={cn(
            'flex flex-col gap-1.5',
            viewMode !== 'trace' && 'opacity-30 pointer-events-none'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
              Chart Series
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-52">
                  Select up to {MAX_VISIBLE_SERIES} series for a cleaner chart.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="ml-auto text-2xs tabular-nums text-muted-foreground">
              {visible.size}/{MAX_VISIBLE_SERIES}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            {TELEMETRY_SERIES_META.map((opt) => {
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
                    isActive ? 'bg-white/5' : 'opacity-50 hover:opacity-75',
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
                    <span className="text-xs font-bold text-foreground">
                      {opt.label}
                    </span>
                    <span className="text-2xs text-muted-foreground">
                      {opt.description}
                    </span>
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
                        <svg
                          viewBox="0 0 16 16"
                          className="size-full text-background"
                        >
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
