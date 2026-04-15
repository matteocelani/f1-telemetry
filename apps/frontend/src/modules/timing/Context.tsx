'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useHealthCheck } from '@/api/hooks/requests/useSystem';
import {
  ACTIVITY_TIMEOUT_MS,
  GRACE_PERIOD_MS,
  MS_PER_SECOND,
} from '@/constants/numbers';
import { useHeaderData } from '@/modules/timing/hooks/useHeaderData';
import { LiveTimingContext } from '@/modules/timing/hooks/useLiveTiming';
import { useTimingRows } from '@/modules/timing/hooks/useTimingRows';
import type { CenterTab, LiveTimingContextType } from '@/modules/timing/types';
import { useConnection } from '@/store/connection';
import { useSession } from '@/store/session';
import { wsClient } from '@/ws/wsClient';

interface LiveTimingProviderProps {
  children: ReactNode;
}

// Aggregates WS lifecycle, store data, and shared UI state for the live dashboard.
export function LiveTimingProvider({ children }: LiveTimingProviderProps) {
  const { isError: isHealthError, failureCount } = useHealthCheck();
  const connectionStatus = useConnection((s) => s.status);
  const lastActivityAt = useConnection((s) => s.lastActivityAt);
  const sessionStartDate = useSession((s) => s.sessionInfo?.StartDate);

  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CenterTab>('map');
  const [isDetailedView, setIsDetailedView] = useState(false);

  const isBackendOnline = !isHealthError || failureCount === 0;

  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  // Tick drives re-evaluation of isActivityRecent every second.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), MS_PER_SECOND);
    return () => clearInterval(id);
  }, []);

  // Timestamp comparison instead of setTimeout to survive browser timer throttling.
  const isActivityRecent =
    lastActivityAt !== null && Date.now() - lastActivityAt < ACTIVITY_TIMEOUT_MS;

  // Optimistic: assume fresh unless we can prove the session is stale or future.
  const isSessionFresh = useMemo(() => {
    if (!sessionStartDate) return true;
    const start = new Date(sessionStartDate).getTime();
    if (isNaN(start)) return true;
    const elapsed = Date.now() - start;
    return elapsed >= 0 && elapsed < GRACE_PERIOD_MS;
  }, [sessionStartDate]);

  const isConnected = connectionStatus === 'connected';
  // Skip session freshness check in dev so replay of old recordings works.
  const isDev = process.env.NODE_ENV === 'development';
  const isLive = isActivityRecent && (isDev || isSessionFresh);

  const header = useHeaderData();
  const { rows, sessionPart, eliminationPos, knockoutLines, isQualifying } = useTimingRows();

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
