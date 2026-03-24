'use client';

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { DriverMeta, TeamsMap } from '@/types/data';
import { cn } from '@/lib/utils';
import driversData from '@/data/drivers.json';
import teamsData from '@/data/teams.json';
import { useTiming } from '@/store/timing';
import { useTrack } from '@/store/track';

const teams = teamsData as unknown as TeamsMap;
const staticDrivers = driversData as unknown as DriverMeta[];

const TRACK_PADDING = 40;
const DOT_RADIUS = 6;

interface TrackMapProps {
  className?: string;
}

/**
 * SVG-based track map rendering car positions.
 * During no-data state shows a placeholder with position dots.
 */
export function TrackMap({ className }: TrackMapProps) {
  const positions = useTrack(useShallow((s) => s.positions));
  const driverList = useTiming(useShallow((s) => s.driverList));

  const { viewBox, dots } = useMemo(() => {
    const entries = Object.entries(positions);

    if (entries.length === 0) {
      return { viewBox: '0 0 800 400', dots: [] };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const [, pos] of entries) {
      if (pos.X < minX) minX = pos.X;
      if (pos.X > maxX) maxX = pos.X;
      if (pos.Y < minY) minY = pos.Y;
      if (pos.Y > maxY) maxY = pos.Y;
    }

    const width = maxX - minX + TRACK_PADDING * 2;
    const height = maxY - minY + TRACK_PADDING * 2;
    const vb = `${minX - TRACK_PADDING} ${minY - TRACK_PADDING} ${width} ${height}`;

    const d = entries.map(([driverNo, pos]) => {
      const wsDriver = driverList[driverNo];
      const staticDriver = staticDrivers.find(
        (dr) => dr.driverNumber === driverNo
      );
      const teamId = staticDriver?.teamId ?? '';
      const color = wsDriver?.TeamColour
        ? `#${wsDriver.TeamColour}`
        : (teams[teamId]?.colorHex ?? 'var(--color-muted-foreground)');
      const tla = wsDriver?.Tla ?? staticDriver?.tla ?? driverNo;

      return { driverNo, x: pos.X, y: pos.Y, color, tla };
    });

    return { viewBox: vb, dots: d };
  }, [positions, driverList]);

  const hasData = dots.length > 0;

  return (
    <div
      className={cn(
        'relative flex flex-1 items-center justify-center',
        className
      )}
    >
      {!hasData ? (
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30" />
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Waiting for track data…
          </p>
        </div>
      ) : (
        <svg
          viewBox={viewBox}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {dots.map((dot) => (
            <g key={dot.driverNo}>
              <circle
                cx={dot.x}
                cy={dot.y}
                r={DOT_RADIUS}
                fill={dot.color}
                stroke="currentColor"
                className="text-black/50"
                strokeWidth={1}
              />
              <text
                x={dot.x}
                y={dot.y - DOT_RADIUS - 3}
                textAnchor="middle"
                fill="currentColor"
                fontSize={8}
                fontWeight={700}
                fontFamily="monospace"
              >
                {dot.tla}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
