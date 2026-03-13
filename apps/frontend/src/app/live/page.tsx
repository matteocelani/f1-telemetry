'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useShallow } from 'zustand/react/shallow';
import { StatusDot } from '@/components/global/StatusDot';
import { cn } from '@/lib/utils';
import { LiveOfflineFallback } from '@/app/live/components/LiveOfflineFallback';
import { RaceControlFeed } from '@/app/live/components/RaceControlFeed';
import { TelemetryPanel } from '@/app/live/components/TelemetryPanel';
import { TimingTower } from '@/app/live/components/TimingTower';
import { TrackMap } from '@/app/live/components/TrackMap';
import { useTimingRows } from '@/modules/timing/hooks/useTimingRows';
import { useConnection } from '@/store/connection';
import { useSession } from '@/store/session';
import { useWeather } from '@/store/weather';
import { wsClient } from '@/ws/wsClient';

type CenterTab = 'map' | 'telemetry' | 'raceControl';

const CENTER_TABS: { id: CenterTab; label: string }[] = [
  { id: 'map', label: 'Track Map' },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'raceControl', label: 'Race Control' },
];

export default function LivePage() {
  const connectionStatus = useConnection((s) => s.status);
  const hasActivity = useConnection((s) => s.hasActivity);
  const sessionInfo = useSession(useShallow((s) => s.sessionInfo));
  const weather = useWeather(useShallow((s) => s.weather));
  const rows = useTimingRows();

  const [activeTab, setActiveTab] = useState<CenterTab>('map');

  // WebSocket connection management lifecycle.
  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  const handleTabChange = useCallback((tab: CenterTab) => {
    setActiveTab(tab);
  }, []);

  const statusVariant = useMemo(() => {
    if (connectionStatus === 'connected') return 'connected';
    if (connectionStatus === 'reconnecting') return 'reconnecting';
    return 'disconnected';
  }, [connectionStatus]);

  // Gate the entire dashboard behind active WS data flow
  if (connectionStatus !== 'connected' || !hasActivity) {
    return (
      <div className="flex h-dvh w-full flex-col bg-background text-foreground">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 bg-card/50 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xs font-bold uppercase tracking-widest text-foreground group-hover:text-primary transition-colors">
                F1 Live
              </span>
            </Link>
            <StatusDot
              variant={
                connectionStatus === 'connecting'
                  ? 'reconnecting'
                  : connectionStatus === 'connected'
                    ? 'connected'
                    : 'disconnected'
              }
              className="h-2 w-2"
            />
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          <LiveOfflineFallback />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Top Bar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 bg-card/60 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Dashboard
          </Link>
          <div className="h-4 w-px bg-border/40" />
          <div className="flex items-center gap-2">
            <StatusDot variant={statusVariant} />
            <span className="text-xs font-bold uppercase tracking-widest text-foreground">
              {sessionInfo?.Name ?? 'Waiting for Session...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {weather && (
            <div className="hidden items-center gap-4 sm:flex">
              <span className="text-xs font-bold tabular-nums text-muted-foreground uppercase tracking-wider">
                Air {weather.AirTemp}°C
              </span>
              <span className="text-xs font-bold tabular-nums text-muted-foreground uppercase tracking-wider">
                Track {weather.TrackTemp}°C
              </span>
              <span className="text-xs font-bold tabular-nums text-muted-foreground uppercase tracking-wider">
                Humidity {weather.Humidity}%
              </span>
            </div>
          )}
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border',
              connectionStatus === 'connected'
                ? 'bg-f1-sector-green/10 text-f1-sector-green border-f1-sector-green/20'
                : 'bg-destructive/10 text-destructive border-destructive/20'
            )}
          >
            {connectionStatus}
          </span>
        </div>
      </header>

      {/* ── Main Dashboard Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Timing Tower (Desktop/Tablet) */}
        <aside className="hidden w-80 flex-col border-r border-border/40 bg-card/20 xl:flex xl:w-96">
          <TimingTower rows={rows} className="flex-1" />
        </aside>

        {/* Center Panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Tab Selection for smaller viewports */}
          <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border/30 px-4 xl:hidden">
            {CENTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all',
                  activeTab === tab.id
                    ? 'bg-foreground text-background shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Mobile-only split view */}
            <div className="flex w-full flex-col md:hidden">
              <TimingTower
                rows={rows}
                className="h-1/2 border-b border-border/40"
              />
              <div className="flex-1 overflow-hidden p-4">
                {activeTab === 'map' && <TrackMap />}
                {activeTab === 'telemetry' && <TelemetryPanel />}
                {activeTab === 'raceControl' && <RaceControlFeed />}
              </div>
            </div>

            {/* Desktop/Tablet content area */}
            <div className="hidden flex-1 flex-col md:flex">
              <div className="flex-1 overflow-hidden p-6 xl:p-8">
                <div className="hidden h-full xl:block">
                  <TrackMap className="h-full" />
                </div>
                <div className="h-full xl:hidden">
                  {activeTab === 'map' && <TrackMap className="h-full" />}
                  {activeTab === 'telemetry' && (
                    <TelemetryPanel className="h-full" />
                  )}
                  {activeTab === 'raceControl' && <RaceControlFeed />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry/Insights (Ultrawide desktop) */}
        <aside className="hidden w-96 flex-col border-l border-border/40 bg-card/20 p-6 xl:flex">
          <TelemetryPanel className="flex-1" />
          <div className="mt-8 border-t border-border/40 pt-6">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Race Control
            </h3>
            <RaceControlFeed className="h-80" />
          </div>
        </aside>
      </div>
    </div>
  );
}
