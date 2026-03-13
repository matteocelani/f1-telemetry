import { useEffect, useRef, useCallback } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useTelemetry } from '@/store/telemetry';

const CHART_HEIGHT = 200;
const MS_PER_SECOND = 1000;

// Theme-compliant colors (mapped from Tailwind v4 defaults)
const COLOR_SPEED = '#3b82f6'; // blue-500
const COLOR_THROTTLE = '#22c55e'; // green-500
const COLOR_BRAKE = '#ef4444'; // red-500
const COLOR_AXIS = '#888888'; // foreground/50 equivalent
const COLOR_GRID = '#333333'; // border equivalent

/**
 * Bypasses React rendering for uPlot.
 * Subscribes imperatively to Zustand and calls uPlot.setData() directly on the canvas.
 */
export function useTelemetryChart(driverNo: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uplotRef = useRef<uPlot | null>(null);

  const buildOpts = useCallback(
    (width: number): uPlot.Options => ({
      width,
      height: CHART_HEIGHT,
      cursor: { show: true },
      series: [
        {},
        { label: 'Speed', stroke: COLOR_SPEED, width: 2 },
        { label: 'Throttle', stroke: COLOR_THROTTLE, width: 1 },
        { label: 'Brake', stroke: COLOR_BRAKE, width: 1 },
      ],
      axes: [
        { show: false },
        { stroke: COLOR_AXIS, grid: { stroke: COLOR_GRID, width: 1 } },
      ],
      scales: {
        x: { time: false },
      },
    }),
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const opts = buildOpts(el.clientWidth);

    uplotRef.current = new uPlot(opts, [[], [], [], []], el);

    const unsubscribe = useTelemetry.subscribe((state) => {
      const carData = state.cars[driverNo];
      if (!carData || !uplotRef.current) return;

      const times = carData.history.map((p) => p.time / MS_PER_SECOND);
      const speeds = carData.history.map((p) => p.speed);
      const throttles = carData.history.map((p) => p.throttle);
      const brakes = carData.history.map((p) => p.brake);

      uplotRef.current.setData([times, speeds, throttles, brakes]);
    });

    const handleResize = () => {
      if (uplotRef.current && el) {
        uplotRef.current.setSize({
          width: el.clientWidth,
          height: CHART_HEIGHT,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(el);

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      uplotRef.current?.destroy();
    };
  }, [driverNo, buildOpts]);

  return { containerRef };
}
