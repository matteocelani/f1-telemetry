import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useTelemetry } from '@/store/telemetry';

const MS_PER_SECOND = 1000;
const MIN_CHART_HEIGHT = 80;

export type TelemetrySeries =
  | 'speed'
  | 'throttle'
  | 'brake'
  | 'rpm'
  | 'gear'
  | 'activeAero';

interface SeriesDef {
  key: TelemetrySeries;
  field: 'speed' | 'throttle' | 'brake' | 'rpm' | 'gear' | 'activeAero';
  color: string;
  fill: string;
  scale: string;
  width: number;
}

const ALL_SERIES = [
  {
    key: 'speed',
    field: 'speed',
    color: '#3b82f6',
    fill: 'rgba(59,130,246,0.12)',
    scale: 'speed',
    width: 2,
  },
  {
    key: 'throttle',
    field: 'throttle',
    color: '#22c55e',
    fill: '',
    scale: 'pct',
    width: 1.5,
  },
  {
    key: 'brake',
    field: 'brake',
    color: '#ef4444',
    fill: '',
    scale: 'pct',
    width: 1.5,
  },
  {
    key: 'rpm',
    field: 'rpm',
    color: '#f59e0b',
    fill: '',
    scale: 'rpm',
    width: 1,
  },
  {
    key: 'gear',
    field: 'gear',
    color: '#a855f7',
    fill: '',
    scale: 'gear',
    width: 2,
  },
  {
    key: 'activeAero',
    field: 'activeAero',
    color: '#06b6d4',
    fill: '',
    scale: 'aero',
    width: 2,
  },
] as const satisfies readonly SeriesDef[];

const COLOR_GRID = 'rgba(128,128,128,0.1)';

function fillPlugin(seriesIdx: number, fillColor: string): uPlot.Plugin {
  return {
    hooks: {
      drawSeries(u: uPlot, idx: number) {
        if (idx !== seriesIdx) return;

        const ctx = u.ctx;
        const s = u.series[idx];
        const xData = u.data[0];
        const yData = u.data[idx];

        if (!s.show || !xData.length || !yData.length) return;

        const x0 = u.valToPos(xData[0], 'x', true);
        const xN = u.valToPos(xData[xData.length - 1], 'x', true);
        const yBase = u.valToPos(0, s.scale!, true);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0, yBase);

        for (let i = 0; i < xData.length; i++) {
          const x = u.valToPos(xData[i], 'x', true);
          const y = u.valToPos(yData[i] ?? 0, s.scale!, true);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(xN, yBase);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.restore();
      },
    },
  };
}

function buildOpts(
  width: number,
  height: number,
  active: SeriesDef[]
): uPlot.Options {
  return {
    width,
    height,
    cursor: { show: true, drag: { x: false, y: false } },
    legend: { show: false },
    plugins: active
      .map((s, i) => (s.fill ? fillPlugin(i + 1, s.fill) : null))
      .filter((p): p is uPlot.Plugin => p !== null),
    series: [
      {},
      ...active.map((s) => ({
        label: s.key,
        stroke: s.color,
        width: s.width,
        scale: s.scale,
        points: { show: false },
      })),
    ],
    axes: [
      { show: false },
      {
        scale: active[0]?.scale ?? 'speed',
        stroke: 'transparent',
        grid: { stroke: COLOR_GRID, width: 1 },
        size: 0,
        ticks: { show: false },
      },
    ],
    scales: {
      x: { time: false },
      speed: {
        auto: true,
        range: (_u: uPlot, min: number, max: number) => [
          Math.max(0, min - 20),
          max + 10,
        ],
      },
      pct: { min: 0, max: 100 },
      rpm: { auto: true },
      gear: { min: 0, max: 9 },
      aero: { min: -0.5, max: 2.5 },
    },
  };
}

/**
 * Renders a speed trace with throttle/brake fill bands.
 * Bypasses React via imperative Zustand subscription → uPlot.setData().
 */
export function useTelemetryChart(
  driverNo: string | null,
  visibleSeries: Set<TelemetrySeries>
) {
  // wrapRef is the outer div whose size is dictated by flex layout (observed for resize).
  // canvasRef is the inner div where uPlot renders (overflow: hidden, never causes scrollbars).
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const uplotRef = useRef<uPlot | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const visibleRef = useRef(visibleSeries);
  visibleRef.current = visibleSeries;

  const active = ALL_SERIES.filter((s) => visibleSeries.has(s.key));

  useEffect(() => {
    if (!wrapRef.current || !canvasRef.current || !driverNo) return;

    const currentActive = ALL_SERIES.filter((s) =>
      visibleRef.current.has(s.key)
    );
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const w = wrap.clientWidth;
    const h = Math.max(wrap.clientHeight, MIN_CHART_HEIGHT);
    sizeRef.current = { w, h };

    const emptyData: uPlot.AlignedData = [
      [],
      ...currentActive.map(() => [] as number[]),
    ];
    uplotRef.current = new uPlot(
      buildOpts(w, h, currentActive),
      emptyData,
      canvas
    );

    const unsubscribe = useTelemetry.subscribe((state) => {
      const carData = state.cars[driverNo];
      if (!carData || !uplotRef.current) return;

      const act = ALL_SERIES.filter((s) => visibleRef.current.has(s.key));
      const hist = carData.history;
      const times = new Float64Array(hist.length);
      const seriesArrays = act.map(() => new Float64Array(hist.length));

      for (let i = 0; i < hist.length; i++) {
        times[i] = hist[i].time / MS_PER_SECOND;
        for (let j = 0; j < act.length; j++) {
          seriesArrays[j][i] = hist[i][act[j].field];
        }
      }

      uplotRef.current.setData([times, ...seriesArrays]);
    });

    // Observe the wrapper (not the canvas) to avoid feedback loop
    let rafId: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!uplotRef.current || !wrap) return;
        const nextW = wrap.clientWidth;
        const nextH = Math.max(wrap.clientHeight, MIN_CHART_HEIGHT);
        if (nextW === sizeRef.current.w && nextH === sizeRef.current.h) return;
        sizeRef.current = { w: nextW, h: nextH };
        uplotRef.current.setSize({ width: nextW, height: nextH });
      });
    });
    resizeObserver.observe(wrap);

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      uplotRef.current?.destroy();
      uplotRef.current = null;
    };
  }, [driverNo, active.length]);

  return { wrapRef, canvasRef };
}
