'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MAX_RPM } from '@/constants/numbers';
import { useTelemetry } from '@/store/telemetry';

const AERO_LABELS: Record<number, string> = {
  0: 'HIGH DOWNFORCE',
  1: 'LOW DRAG',
  2: 'OVERTAKE BOOST',
};
const AERO_CLASSES: Record<number, string> = {
  0: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  1: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  2: 'bg-amber-500/30 text-amber-400 border-amber-500/40',
};

const BRAKE_ACTIVE_THRESHOLD = 5;
const RPM_SEGMENT_COUNT = 20;
const GEAR_FLASH_DURATION_MS = 150;

// RPM LED gradient: green (low) → yellow (mid) → red (high)
const RPM_LOW_THRESHOLD = 0.6;
const RPM_MID_THRESHOLD = 0.8;
const RPM_COLOR_LOW = '#22c55e';
const RPM_COLOR_MID = '#eab308';
const RPM_COLOR_HIGH = '#ef4444';

interface TelemetryHudProps {
  driverNo: string;
  teamColor: string;
  tla: string;
}

// Fully imperative — subscribes to Zustand and mutates DOM refs directly at 3.7Hz.
export function TelemetryHud({ driverNo, teamColor, tla }: TelemetryHudProps) {
  const speedRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const gearWrapRef = useRef<HTMLDivElement>(null);
  const throttleBarRef = useRef<HTMLDivElement>(null);
  const throttleTextRef = useRef<HTMLSpanElement>(null);
  const brakeWrapRef = useRef<HTMLDivElement>(null);
  const rpmSegmentsRef = useRef<HTMLDivElement>(null);
  const rpmTextRef = useRef<HTMLSpanElement>(null);
  const aeroRef = useRef<HTMLSpanElement>(null);
  const prevGearRef = useRef<number>(-1);

  useEffect(() => {
    const unsubscribe = useTelemetry.subscribe((state) => {
      const car = state.cars[driverNo];
      if (!car) return;

      const t = car.live;

      // Speed
      if (speedRef.current) speedRef.current.textContent = String(t.speed);

      // Gear with flash on change
      if (gearRef.current) {
        gearRef.current.textContent = t.gear === 0 ? 'N' : String(t.gear);
      }
      if (gearWrapRef.current && prevGearRef.current !== t.gear && prevGearRef.current !== -1) {
        gearWrapRef.current.style.transform = 'scale(1.2)';
        gearWrapRef.current.style.color = teamColor;
        setTimeout(() => {
          if (gearWrapRef.current) {
            gearWrapRef.current.style.transform = 'scale(1)';
            gearWrapRef.current.style.color = '';
          }
        }, GEAR_FLASH_DURATION_MS);
      }
      prevGearRef.current = t.gear;

      // Throttle
      if (throttleBarRef.current) throttleBarRef.current.style.width = `${t.throttle}%`;
      if (throttleTextRef.current) throttleTextRef.current.textContent = `${t.throttle}%`;

      // Brake glow
      if (brakeWrapRef.current) {
        const isBraking = t.brake > BRAKE_ACTIVE_THRESHOLD;
        brakeWrapRef.current.style.opacity = isBraking ? '1' : '0.12';
        brakeWrapRef.current.style.boxShadow = isBraking
          ? '0 0 12px rgba(239,68,68,0.5), 0 0 4px rgba(239,68,68,0.3)'
          : 'none';
      }

      // RPM segments
      if (rpmSegmentsRef.current) {
        const pct = Math.min(t.rpm / MAX_RPM, 1);
        const activeCount = Math.round(pct * RPM_SEGMENT_COUNT);
        const segments = rpmSegmentsRef.current.children;
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i] as HTMLElement;
          if (i < activeCount) {
            seg.style.opacity = '1';
            const ratio = i / (RPM_SEGMENT_COUNT - 1);
            if (ratio < RPM_LOW_THRESHOLD) seg.style.backgroundColor = RPM_COLOR_LOW;
            else if (ratio < RPM_MID_THRESHOLD) seg.style.backgroundColor = RPM_COLOR_MID;
            else seg.style.backgroundColor = RPM_COLOR_HIGH;
          } else {
            seg.style.opacity = '0.1';
            seg.style.backgroundColor = '';
          }
        }
      }
      if (rpmTextRef.current) {
        rpmTextRef.current.textContent = t.rpm > 0 ? `${(t.rpm / 1000).toFixed(1)}k` : '—';
      }

      // Aero
      if (aeroRef.current) {
        const label = AERO_LABELS[t.activeAero] ?? '—';
        const colorClass = AERO_CLASSES[t.activeAero] ?? 'bg-muted text-muted-foreground border-border';
        aeroRef.current.textContent = label;
        aeroRef.current.className = cn(
          'rounded-full border px-3 py-1 text-2xs font-black tracking-widest transition-colors duration-200',
          colorClass
        );
      }
    });

    return unsubscribe;
  }, [driverNo, teamColor]);

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-4 py-3">
      {/* Team color ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${teamColor} 0%, transparent 70%)`,
        }}
      />

      <div className="relative flex w-full max-w-96 flex-col gap-4">
        {/* Hero: Speed + Gear */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center">
            <span
              ref={speedRef}
              className="text-5xl font-black tabular-nums leading-none tracking-tight text-foreground"
            >
              0
            </span>
            <span className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
              km/h
            </span>
          </div>

          <div className="h-10 w-px bg-border" />

          <div
            ref={gearWrapRef}
            className="flex flex-col items-center transition-all duration-150"
          >
            <span
              ref={gearRef}
              className="text-5xl font-black tabular-nums leading-none tracking-tight"
            >
              N
            </span>
            <span className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
              gear
            </span>
          </div>
        </div>

        {/* Throttle */}
        <div className="flex items-center gap-2.5">
          <span className="w-8 shrink-0 text-right text-xs font-bold text-emerald-500">THR</span>
          <div className="h-6 flex-1 overflow-hidden rounded-full bg-emerald-500/8">
            <div
              ref={throttleBarRef}
              className="h-full w-0 rounded-full bg-emerald-500 transition-[width] duration-75"
            />
          </div>
          <span
            ref={throttleTextRef}
            className="w-10 shrink-0 text-right text-xs font-black tabular-nums text-emerald-500"
          >
            0%
          </span>
        </div>

        {/* Brake */}
        <div className="flex items-center gap-2.5">
          <span className="w-8 shrink-0 text-right text-xs font-bold text-red-500">BRK</span>
          <div
            ref={brakeWrapRef}
            className="h-6 flex-1 rounded-full bg-red-500 opacity-12 transition-all duration-75"
          />
          <span className="w-10 shrink-0" />
        </div>

        {/* RPM LED segments */}
        <div className="flex items-center gap-2.5">
          <span className="w-8 shrink-0 text-right text-xs font-bold text-muted-foreground">RPM</span>
          <div ref={rpmSegmentsRef} className="flex flex-1 gap-0.5">
            {Array.from({ length: RPM_SEGMENT_COUNT }).map((_, i) => (
              <div
                key={i}
                className="h-3 flex-1 rounded-sm bg-muted-foreground opacity-10 transition-opacity duration-75"
              />
            ))}
          </div>
          <span
            ref={rpmTextRef}
            className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-muted-foreground"
          >
            —
          </span>
        </div>

        {/* Aero mode */}
        <div className="flex justify-center">
          <span
            ref={aeroRef}
            className="rounded-full border border-border bg-muted px-3 py-1 text-2xs font-black tracking-widest text-muted-foreground transition-colors duration-200"
          >
            —
          </span>
        </div>
      </div>
    </div>
  );
}
