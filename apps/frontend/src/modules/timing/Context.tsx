'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useHeaderData } from '@/modules/timing/hooks/useHeaderData';
import { LiveTimingContext } from '@/modules/timing/hooks/useLiveTiming';
import { useTimingRows } from '@/modules/timing/hooks/useTimingRows';
import type { CenterTab, LiveTimingContextType } from '@/modules/timing/types';
import { useConnection } from '@/store/connection';
import { wsClient } from '@/ws/wsClient';

interface LiveTimingProviderProps {
  children: ReactNode;
}

// Aggregates WS lifecycle, store data, and shared UI state for the live dashboard.
export function LiveTimingProvider({ children }: LiveTimingProviderProps) {
  const connectionStatus = useConnection((s) => s.status);
  const hasActivity = useConnection((s) => s.hasActivity);

  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CenterTab>('map');
  const [isDetailedView, setIsDetailedView] = useState(false);

  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  const isConnected = connectionStatus === 'connected';
  const isLive = isConnected && hasActivity;

  const header = useHeaderData();
  const rows = useTimingRows();

  const handleSetSelectedDriver = useCallback(
    (driverNo: string | null) => setSelectedDriver(driverNo),
    []
  );

  const handleSetActiveTab = useCallback(
    (tab: CenterTab) => setActiveTab(tab),
    []
  );

  const handleSetDetailedView = useCallback(
    (value: boolean) => setIsDetailedView(value),
    []
  );

  const value = useMemo<LiveTimingContextType>(
    () => ({
      isConnected,
      isLive,
      header,
      rows,
      selectedDriver,
      setSelectedDriver: handleSetSelectedDriver,
      activeTab,
      setActiveTab: handleSetActiveTab,
      isDetailedView,
      setDetailedView: handleSetDetailedView,
    }),
    [
      isConnected,
      isLive,
      header,
      rows,
      selectedDriver,
      handleSetSelectedDriver,
      activeTab,
      handleSetActiveTab,
      isDetailedView,
      handleSetDetailedView,
    ]
  );

  return (
    <LiveTimingContext value={value}>
      {children}
    </LiveTimingContext>
  );
}
