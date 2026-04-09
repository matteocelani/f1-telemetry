'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useHealthCheck } from '@/api/hooks/requests/useSystem';
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
  // --- External data hooks ---
  const { isError: isHealthError, failureCount } = useHealthCheck();
  const connectionStatus = useConnection((s) => s.status);
  const hasActivity = useConnection((s) => s.hasActivity);
  const header = useHeaderData();
  const { rows, sessionPart, eliminationPos, knockoutLines, isQualifying } = useTimingRows();

  // --- Local UI state ---
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CenterTab>('map');
  const [isDetailedView, setIsDetailedView] = useState(false);

  // --- Derived state ---
  const isBackendOnline = !isHealthError || failureCount === 0;
  const isConnected = connectionStatus === 'connected';
  const isLive = isConnected && hasActivity;

  // --- Effects ---
  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  // --- Stable callbacks ---
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

  // --- Context value ---
  const value = useMemo<LiveTimingContextType>(
    () => ({
      isBackendOnline,
      isConnected,
      isLive,
      header,
      rows,
      sessionPart,
      eliminationPos,
      knockoutLines,
      isQualifying,
      selectedDriver,
      setSelectedDriver: handleSetSelectedDriver,
      activeTab,
      setActiveTab: handleSetActiveTab,
      isDetailedView,
      setDetailedView: handleSetDetailedView,
    }),
    [
      isBackendOnline,
      isConnected,
      isLive,
      header,
      rows,
      sessionPart,
      eliminationPos,
      knockoutLines,
      isQualifying,
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
