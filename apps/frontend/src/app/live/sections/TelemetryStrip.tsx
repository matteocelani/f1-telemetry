'use client';

import { memo, useCallback, useState } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TelemetryHud } from '@/app/live/components/TelemetryHud';
import { TelemetrySettings } from '@/app/live/components/TelemetrySettings';
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';
import {
  useTelemetryChart,
  type TelemetrySeries,
} from '@/modules/timing/hooks/useTelemetryChart';
import type { UITimingRow } from '@/modules/timing/types';

type ViewMode = 'hud' | 'trace';

const DEFAULT_SERIES = ['speed', 'throttle', 'brake'] as const;

interface TelemetryStripProps {
  className?: string;
}

export function TelemetryStrip({ className }: TelemetryStripProps) {
  const { rows, selectedDriver, setSelectedDriver } = useLiveTiming();
  const [viewMode, setViewMode] = useState<ViewMode>('hud');

  const [visibleSeries, setVisibleSeries] = useState<Set<TelemetrySeries>>(
    () => new Set(DEFAULT_SERIES)
  );

  const handleToggleSeries = useCallback((series: TelemetrySeries) => {
    setVisibleSeries((prev) => {
      const next = new Set(prev);
      if (next.has(series)) {
        if (next.size > 1) next.delete(series);
      } else if (next.size < 4) {
        next.add(series);
      }
      return next;
    });
  }, []);

  const { wrapRef, canvasRef } = useTelemetryChart(
    viewMode === 'trace' ? selectedDriver : null,
    visibleSeries
  );

  const selectedRow = rows.find((r) => r.driverNo === selectedDriver);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="shrink-0 border-b border-border px-3 py-1.5">
        <div className="mb-1.5 flex items-center gap-2">
          <Activity className="size-3 text-foreground" />
          <span className="text-2xs font-bold uppercase tracking-widest text-foreground">
            Telemetry
          </span>

          {/* HUD / Trace toggle + settings */}
          <div className="ml-auto flex items-center gap-1 rounded-full bg-muted p-0.5">
            {(['hud', 'trace'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider transition-colors',
                  viewMode === mode
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode}
              </button>
            ))}
            {viewMode === 'trace' && (
              <TelemetrySettings visible={visibleSeries} onToggle={handleToggleSeries} />
            )}
          </div>
        </div>

        {/* Driver chips */}
        <DriverChips
          rows={rows}
          selectedDriver={selectedDriver}
          onSelect={setSelectedDriver}
        />
      </div>

      {/* Content */}
      {selectedDriver && selectedRow ? (
        <div className="flex flex-1 flex-col min-h-0">
          {viewMode === 'hud' ? (
            <TelemetryHud
              driverNo={selectedDriver}
              teamColor={selectedRow.teamColor}
              tla={selectedRow.tla}
            />
          ) : (
            <div ref={wrapRef} className="flex-1 min-h-0 overflow-hidden">
              <div ref={canvasRef} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <Activity className="size-5 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Select a driver above
          </p>
        </div>
      )}
    </div>
  );
}

// Compact driver chips row
const DriverChips = memo(function DriverChips({
  rows,
  selectedDriver,
  onSelect,
}: {
  rows: UITimingRow[];
  selectedDriver: string | null;
  onSelect: (driverNo: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {rows.map((row) => {
        const isActive = selectedDriver === row.driverNo;
        return (
          <button
            key={row.driverNo}
            type="button"
            onClick={() => onSelect(isActive ? null : row.driverNo)}
            className={cn(
              'rounded px-2 py-1 text-xs font-black uppercase tracking-wide transition-colors',
              isActive
                ? 'text-white ring-1 ring-white/20'
                : 'text-white/70 hover:text-white'
            )}
            style={{
              backgroundColor: isActive ? row.teamColor : `${row.teamColor}40`,
            }}
          >
            {row.tla}
          </button>
        );
      })}
    </div>
  );
});
