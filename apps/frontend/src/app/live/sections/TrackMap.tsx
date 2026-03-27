'use client';

import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';
import { useTrackMap } from '@/modules/timing/hooks/useTrackMap';

interface TrackMapProps {
  className?: string;
}

const DOT_RADIUS = 6;
const DOT_RADIUS_SELECTED = 9;
const LABEL_FONT_SIZE = 10;
const LABEL_OFFSET_Y = -11;
const LABEL_OFFSET_Y_SELECTED = -14;
const TRACK_STROKE_WIDTH = 3;
const TRANSITION_MS = 300;
const GLOW_RADIUS = 18;

export function TrackMap({ className }: TrackMapProps) {
  const { dots, circuit } = useTrackMap();
  const { selectedDriver, setSelectedDriver } = useLiveTiming();

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
      className={cn('flex h-full items-center justify-center p-2', className)}
    >
      <svg
        viewBox={circuit.viewBox}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={circuit.path}
          fill="none"
          stroke="currentColor"
          strokeWidth={TRACK_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.2"
        />

        {dots.map((dot) => {
          const isSelected = selectedDriver === dot.driverNo;
          const radius = isSelected ? DOT_RADIUS_SELECTED : DOT_RADIUS;
          const labelY = isSelected ? LABEL_OFFSET_Y_SELECTED : LABEL_OFFSET_Y;

          return (
            <g
              key={dot.driverNo}
              style={{
                transform: `translate(${dot.x}px, ${dot.y}px)`,
                transition: `transform ${TRANSITION_MS}ms linear`,
              }}
              className="cursor-pointer"
              onClick={() => setSelectedDriver(isSelected ? null : dot.driverNo)}
            >
              {isSelected && (
                <circle
                  r={GLOW_RADIUS}
                  fill={dot.teamColor}
                  opacity="0.25"
                />
              )}
              <circle r={radius} fill={dot.teamColor} />
              <text
                y={labelY}
                textAnchor="middle"
                dominantBaseline="auto"
                fill="currentColor"
                fontSize={LABEL_FONT_SIZE}
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                {dot.tla}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
