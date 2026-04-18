'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { useHealthCheck } from '@/api/hooks/requests/useSystem';
import { useHeaderData } from '@/modules/timing/hooks/useHeaderData';
import { useIsLive } from '@/modules/timing/hooks/useIsLive';
import { LiveTimingContext } from '@/modules/timing/hooks/useLiveTiming';
import { useTimingRows } from '@/modules/timing/hooks/useTimingRows';
import type { LiveTimingContextType } from '@/modules/timing/types';
import { useConnection } from '@/store/connection';
import { wsClient } from '@/ws/wsClient';

interface LiveTimingProviderProps {
  children: ReactNode;
}

// Aggregates WS lifecycle and derived live-dashboard state. Ephemeral UI state lives in useUI.
export function LiveTimingProvider({ children }: LiveTimingProviderProps) {
  const { isError: isHealthError, failureCount } = useHealthCheck();
  const connectionStatus = useConnection((s) => s.status);

  const isBackendOnline = !isHealthError || failureCount === 0;

  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  const isConnected = connectionStatus === 'connected';
  const isLive = useIsLive();

  const header = useHeaderData();
  const { rows, sessionPart, eliminationPos, knockoutLines, isQualifying } =
    useTimingRows();

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
    ]
  );

  return <LiveTimingContext value={value}>{children}</LiveTimingContext>;
}
