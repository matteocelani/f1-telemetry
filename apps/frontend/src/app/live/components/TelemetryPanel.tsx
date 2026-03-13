'use client';

import { useState, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import driversData from '@/data/drivers.json';
import teamsData from '@/data/teams.json';
import { useTelemetryChart } from '@/modules/timing/hooks/useTelemetryChart';
import { useTiming } from '@/store/timing';

type TeamsMap = Record<string, { colorHex: string; name: string }>;
type DriverMeta = { driverNumber: string; tla: string; teamId: string };

const teams = teamsData as TeamsMap;
const staticDrivers = driversData as DriverMeta[];

const DEFAULT_DRIVER_NO = '44';

interface TelemetryPanelProps {
  className?: string;
}

function TelemetryChart({ driverNo }: { driverNo: string }) {
  const { containerRef } = useTelemetryChart(driverNo);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm">
      <div className="absolute top-4 left-4 z-10 flex gap-4 pointer-events-none">
        <div className="flex items-center gap-2 rounded-full bg-background/80 px-2.5 py-1 backdrop-blur-md border border-border/40">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-sm" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Speed
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-background/80 px-2.5 py-1 backdrop-blur-md border border-border/40">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-sm" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Throttle
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-background/80 px-2.5 py-1 backdrop-blur-md border border-border/40">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-sm" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Brake
          </span>
        </div>
      </div>
      <div ref={containerRef} className="h-60 w-full" />
    </div>
  );
}

export function TelemetryPanel({ className }: TelemetryPanelProps) {
  const [selectedDriver, setSelectedDriver] = useState(DEFAULT_DRIVER_NO);
  const driverList = useTiming(useShallow((s) => s.driverList));

  const driverOptions = useMemo(() => {
    const wsDrivers = Object.entries(driverList);
    if (wsDrivers.length > 0) {
      return wsDrivers.map(([no, info]) => ({
        driverNo: no,
        tla: info.Tla,
        teamColor: `#${info.TeamColour}`,
      }));
    }
    return staticDrivers.map((d) => ({
      driverNo: d.driverNumber,
      tla: d.tla,
      teamColor: teams[d.teamId]?.colorHex ?? 'var(--muted-foreground)',
    }));
  }, [driverList]);

  const handleDriverSelect = useCallback((driverNo: string) => {
    setSelectedDriver(driverNo);
  }, []);

  const currentDriver = driverOptions.find(
    (d) => d.driverNo === selectedDriver
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-6 overflow-y-auto scrollbar-none',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Live Telemetry
        </h3>
        {currentDriver && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5 border border-border/40">
            <span
              className="h-2 w-2 rounded-full shrink-0 shadow-sm bg-(--team-color)"
              style={
                {
                  '--team-color': currentDriver.teamColor,
                } as React.CSSProperties
              }
            />
            <span className="text-xs font-black tracking-tight">
              {currentDriver.tla}
            </span>
          </div>
        )}
      </div>

      {/* Driver Selector */}
      <div className="flex flex-wrap gap-1.5">
        {driverOptions.map((d) => (
          <button
            key={d.driverNo}
            type="button"
            onClick={() => handleDriverSelect(d.driverNo)}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-tight transition-all duration-300 border',
              d.driverNo === selectedDriver
                ? 'bg-foreground text-background border-foreground shadow-md scale-105'
                : 'bg-card/40 text-muted-foreground border-border/40 hover:bg-card/60 hover:text-foreground hover:border-border/80'
            )}
          >
            {d.tla}
          </button>
        ))}
      </div>

      {/* Chart Section */}
      <div className="flex flex-col gap-4">
        <TelemetryChart driverNo={selectedDriver} />

        {driverOptions.length === 0 && (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border/40">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
              Waiting for session data…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
