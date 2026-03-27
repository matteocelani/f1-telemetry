'use client';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { LiveHeader } from '@/app/live/sections/LiveHeader';
import { LiveOfflineFallback } from '@/app/live/sections/LiveOfflineFallback';
import { RaceControlFeed } from '@/app/live/sections/RaceControlFeed';
import { TelemetryStrip } from '@/app/live/sections/TelemetryStrip';
import { TrackMap } from '@/app/live/sections/TrackMap';
import { TimingTower } from '@/app/live/sections/TimingTower';
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';

const TAB_OPTIONS = [
  { id: 'map', label: 'Map' },
  { id: 'raceControl', label: 'Control' },
  { id: 'telemetry', label: 'Telemetry' },
] as const;

export default function LivePage() {
  const { isLive, activeTab, setActiveTab } = useLiveTiming();
  const breakpoint = useBreakpoint();

  if (!isLive) {
    return <LiveOfflineFallback />;
  }

  return (
    <div className="flex h-full flex-col">
      <LiveHeader />

      <div className="flex-1 min-h-0 overflow-hidden">
        {breakpoint === 'mobile' && (
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel defaultSize="65%" minSize="30%">
              <TimingTower className="h-full" />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize="35%" minSize="15%">
              <div className="flex h-full flex-col">
                <div className="flex h-10 shrink-0 items-center gap-1 border-t border-border px-3">
                  {TAB_OPTIONS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest transition-colors',
                        activeTab === tab.id
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  {activeTab === 'map' && (
                    <TrackMap className="h-full" />
                  )}
                  {activeTab === 'raceControl' && (
                    <RaceControlFeed className="h-full" />
                  )}
                  {activeTab === 'telemetry' && (
                    <TelemetryStrip className="h-full" />
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {breakpoint === 'tablet' && (
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel defaultSize="55%" minSize="35%" maxSize="75%">
              <TimingTower className="h-full" />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize="45%" minSize="25%" maxSize="65%">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel defaultSize="50%" minSize="25%" maxSize="75%">
                  <TrackMap className="h-full" />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize="50%" minSize="25%" maxSize="75%">
                  <TelemetryStrip className="h-full" />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {breakpoint === 'desktop' && (
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel defaultSize="45%" minSize="25%" maxSize="65%">
              <TimingTower className="h-full" />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize="40%" minSize="20%" maxSize="55%">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel defaultSize="60%" minSize="25%" maxSize="80%">
                  <TrackMap className="h-full" />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize="40%" minSize="20%" maxSize="75%">
                  <TelemetryStrip className="h-full" />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize="15%" minSize="10%" maxSize="30%">
              <RaceControlFeed className="h-full" />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
