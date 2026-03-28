'use client';

import { useCallback, useState } from 'react';
import { Activity, Map, Radio } from 'lucide-react';
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

type PanelId = 'map' | 'raceControl' | 'telemetry';

const PANEL_OPTIONS = [
  { id: 'map', label: 'Map', Icon: Map },
  { id: 'telemetry', label: 'Telemetry', Icon: Activity },
  { id: 'raceControl', label: 'Control', Icon: Radio },
] as const;

function PanelContent({ id, className, hideTitle }: { id: PanelId; className?: string; hideTitle?: boolean }) {
  switch (id) {
    case 'map':
      return <TrackMap className={className} />;
    case 'raceControl':
      return <RaceControlFeed className={className} hideTitle={hideTitle} />;
    case 'telemetry':
      return <TelemetryStrip className={className} hideTitle={hideTitle} />;
  }
}

function PanelSelector({
  selected,
  options,
  onSelect,
}: {
  selected: PanelId;
  options: typeof PANEL_OPTIONS;
  onSelect: (id: PanelId) => void;
}) {
  return (
    <div className="grid shrink-0 border-b border-border" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={cn(
            'py-1.5 text-center text-2xs font-bold uppercase tracking-widest transition-colors',
            selected === tab.id
              ? 'bg-foreground/5 text-foreground border-b-2 border-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <tab.Icon className="inline size-3" /> {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function LivePage() {
  const { isLive, activeTab, setActiveTab } = useLiveTiming();
  const breakpoint = useBreakpoint();

  const [tabletTop, setTabletTop] = useState<PanelId>('map');
  const [tabletBottom, setTabletBottom] = useState<PanelId>('telemetry');

  // Swap panels when selecting the same content as the other panel
  const handleTabletTop = useCallback((id: PanelId) => {
    if (id === tabletBottom) setTabletBottom(tabletTop);
    setTabletTop(id);
  }, [tabletBottom, tabletTop]);

  const handleTabletBottom = useCallback((id: PanelId) => {
    if (id === tabletTop) setTabletTop(tabletBottom);
    setTabletBottom(id);
  }, [tabletTop, tabletBottom]);

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
                <div className="grid shrink-0 grid-cols-3 border-t border-border">
                  {PANEL_OPTIONS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'py-1.5 text-center text-2xs font-bold uppercase tracking-widest transition-colors',
                        activeTab === tab.id
                          ? 'bg-foreground/5 text-foreground border-b-2 border-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <tab.Icon className="inline size-3" /> {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  <PanelContent id={activeTab} className="h-full" hideTitle />
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
                  <div className="flex h-full flex-col">
                    <PanelSelector
                      selected={tabletTop}
                      options={PANEL_OPTIONS}
                      onSelect={handleTabletTop}
                    />
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <PanelContent id={tabletTop} className="h-full" hideTitle />
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize="50%" minSize="25%" maxSize="75%">
                  <div className="flex h-full flex-col">
                    <PanelSelector
                      selected={tabletBottom}
                      options={PANEL_OPTIONS}
                      onSelect={handleTabletBottom}
                    />
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <PanelContent id={tabletBottom} className="h-full" hideTitle />
                    </div>
                  </div>
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
