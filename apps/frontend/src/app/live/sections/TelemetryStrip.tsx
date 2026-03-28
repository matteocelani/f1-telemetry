'use client';

import { useCallback, useState } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TelemetryHud } from '@/app/live/components/TelemetryHud';
import { TelemetrySettings } from '@/app/live/components/TelemetrySettings';
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';
import {
  useTelemetryChart,
  type TelemetrySeries,
} from '@/modules/timing/hooks/useTelemetryChart';

type ViewMode = 'hud' | 'trace';

const DEFAULT_SERIES = ['speed', 'throttle', 'brake'] as const;

interface TelemetryStripProps {
  className?: string;
  hideTitle?: boolean;
}

export function TelemetryStrip({ className, hideTitle }: TelemetryStripProps) {
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

  const { wrapRef, canvasRef } = useTelemetryChart(selectedDriver, visibleSeries);

  const selectedRow = rows.find((r) => r.driverNo === selectedDriver);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
        {!hideTitle && (
          <>
            <Activity className="size-3 text-foreground" />
            <span className="text-2xs font-bold uppercase tracking-widest text-foreground">
              Telemetry
            </span>
          </>
        )}

        {/* Driver select */}
        <Select
          value={selectedDriver ?? ''}
          onValueChange={(v) => setSelectedDriver(v || null)}
        >
          <SelectTrigger size="sm" className="h-7 w-32 gap-1.5 text-xs md:w-40">
            <SelectValue placeholder="Select driver" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-60">
            {rows.map((row) => (
              <SelectItem key={row.driverNo} value={row.driverNo}>
                <div className="flex items-center gap-2">
                  <div
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: row.teamColor }}
                  />
                  <span className="font-bold">{row.tla}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Settings — contains view mode toggle + trace series */}
        <div className="ml-auto">
          <TelemetrySettings
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            visible={visibleSeries}
            onToggle={handleToggleSeries}
          />
        </div>
      </div>

      {/* Content — both views always mounted, toggled via invisible to avoid jank */}
      {selectedDriver && selectedRow ? (
        <div className="relative flex-1 min-h-0">
          <div className={cn('absolute inset-0', viewMode !== 'hud' && 'invisible')}>
            <TelemetryHud
              driverNo={selectedDriver}
              teamColor={selectedRow.teamColor}
            />
          </div>
          <div className={cn('flex h-full flex-col', viewMode !== 'trace' && 'invisible')}>
            <TraceLegend visible={visibleSeries} />
            <div ref={wrapRef} className="flex-1 min-h-0 overflow-hidden">
              <div ref={canvasRef} />
            </div>
          </div>
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

const SERIES_COLORS = {
  speed: '#3b82f6',
  throttle: '#22c55e',
  brake: '#ef4444',
  rpm: '#f59e0b',
  gear: '#a855f7',
  activeAero: '#06b6d4',
} as const satisfies Record<TelemetrySeries, string>;

const SERIES_LABELS = {
  speed: 'Speed',
  throttle: 'Throttle',
  brake: 'Brake',
  rpm: 'RPM',
  gear: 'Gear',
  activeAero: 'Aero',
} as const satisfies Record<TelemetrySeries, string>;

function TraceLegend({ visible }: { visible: Set<TelemetrySeries> }) {
  const active = [...visible];
  return (
    <div className="flex shrink-0 items-center gap-3 px-3 py-1">
      {active.map((key) => (
        <div key={key} className="flex items-center gap-1">
          <div
            className="size-2 rounded-full"
            style={{ backgroundColor: SERIES_COLORS[key] }}
          />
          <span className="text-2xs font-bold text-muted-foreground">
            {SERIES_LABELS[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
