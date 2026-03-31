'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Info, MapPin } from 'lucide-react';
import type { TrackStatusCode } from '@f1-telemetry/core';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';
import { useTrackMap } from '@/modules/timing/hooks/useTrackMap';

interface TrackMapProps {
  className?: string;
}

const DOT_RADIUS = 6;
const DOT_RADIUS_P1 = 7;
const DOT_RADIUS_SELECTED = 9;
const LABEL_FONT_SIZE = 10;
const LABEL_OFFSET_Y = -11;
const LABEL_OFFSET_Y_SELECTED = -14;
const TRACK_STROKE_WIDTH = 3;
const TRACK_GLOW_WIDTH = 8;
const GLOW_RADIUS = 18;
const START_LINE_LENGTH = 12;
const START_LINE_WIDTH = 2;

const TRACK_STATUS_COLORS: Partial<Record<TrackStatusCode, string>> = {
  '4': '#ef4444',
  '5': '#ef4444',
  '6': '#eab308',
  '7': '#eab308',
};

export function TrackMap({ className }: TrackMapProps) {
  const { drivers, circuit, isSegmentMode, startPercent, projectPercent } =
    useTrackMap();
  const { selectedDriver, setSelectedDriver, header } = useLiveTiming();

  const dotRefs = useRef<Map<string, SVGGElement>>(new Map());
  const frameIdRef = useRef(0);

  const trackStatusColor = header.trackStatus
    ? TRACK_STATUS_COLORS[header.trackStatus]
    : undefined;

  const visibleDrivers = drivers.filter((d) => !d.inPit);

  // Callback ref: registers/unregisters SVG group elements for direct DOM updates
  const registerDotRef = useCallback(
    (driverNo: string) => (el: SVGGElement | null) => {
      if (el) {
        dotRefs.current.set(driverNo, el);
      } else {
        dotRefs.current.delete(driverNo);
      }
    },
    []
  );

  // 60fps animation loop: projects positions and writes directly to SVG DOM
  useEffect(() => {
    if (!circuit) return;

    const animate = () => {
      for (const [driverNo, el] of dotRefs.current) {
        const percent = projectPercent(driverNo);
        el.style.offsetDistance = `${percent}%`;
      }
      frameIdRef.current = requestAnimationFrame(animate);
    };

    frameIdRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [circuit, projectPercent]);

  if (!circuit) {
    return (
      <div
        className={cn(
          'flex h-full flex-col items-center justify-center gap-2 p-6 text-center',
          className
        )}
      >
        <MapPin className="size-5 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">
          Waiting for track data...
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex h-full items-center justify-center p-2',
        className
      )}
    >
      {isSegmentMode && visibleDrivers.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="absolute bottom-2 left-2 flex cursor-pointer items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 transition-colors hover:bg-muted/80">
              <Info className="size-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Estimated positions
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-72 p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Info className="size-3.5 shrink-0 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">
                  Estimated positions
                </span>
              </div>
              <p className="text-xs leading-relaxed text-foreground">
                The live stream is not sending GPS position data. Car positions
                are being calculated locally from F1 sector timing segments —
                this is an approximation and may not perfectly match real track
                positions.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      )}
      <svg
        viewBox={circuit.viewBox}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Live track map with driver positions"
      >
        {/* Track glow layer */}
        <path
          d={circuit.path}
          fill="none"
          stroke={trackStatusColor ?? 'currentColor'}
          strokeWidth={TRACK_GLOW_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={trackStatusColor ? '0.15' : '0.06'}
        />
        {/* Track path */}
        <path
          d={circuit.path}
          fill="none"
          stroke={trackStatusColor ?? 'currentColor'}
          strokeWidth={TRACK_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={trackStatusColor ? '0.6' : '0.2'}
        />

        {/* Start/finish line */}
        <line
          x1={0}
          y1={-START_LINE_LENGTH / 2}
          x2={0}
          y2={START_LINE_LENGTH / 2}
          stroke="currentColor"
          strokeWidth={START_LINE_WIDTH}
          opacity="0.5"
          style={{
            offsetPath: `path("${circuit.path}")`,
            offsetDistance: `${startPercent}%`,
            offsetRotate: 'auto',
          }}
        />

        {visibleDrivers.map((driver) => {
          const isSelected = selectedDriver === driver.driverNo;
          const isP1 = driver.driverNo === visibleDrivers[0]?.driverNo;
          const radius = isSelected
            ? DOT_RADIUS_SELECTED
            : isP1
              ? DOT_RADIUS_P1
              : DOT_RADIUS;
          const labelY = isSelected ? LABEL_OFFSET_Y_SELECTED : LABEL_OFFSET_Y;

          return (
            <g
              key={driver.driverNo}
              ref={registerDotRef(driver.driverNo)}
              style={{
                offsetPath: `path("${circuit.path}")`,
                offsetDistance: '0%',
                offsetRotate: '0deg',
              }}
              className="cursor-pointer"
              onClick={() =>
                setSelectedDriver(isSelected ? null : driver.driverNo)
              }
            >
              {isSelected && (
                <circle r={GLOW_RADIUS} fill={driver.teamColor} opacity="0.25" />
              )}
              <circle r={radius} fill={driver.teamColor} />
              <text
                y={labelY}
                textAnchor="middle"
                dominantBaseline="auto"
                fill="currentColor"
                fontSize={LABEL_FONT_SIZE}
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                {driver.tla}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
