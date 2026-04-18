import { useEffect, useState } from 'react';
import {
  ACTIVITY_TIMEOUT_MS,
  GRACE_PERIOD_MS,
  MS_PER_SECOND,
} from '@/constants/numbers';
import { useConnection } from '@/store/connection';
import { useSession } from '@/store/session';

// Timestamp comparison instead of setTimeout to survive browser timer throttling.
function computeIsLive(
  lastActivityAt: number | null,
  sessionStartDate: string | undefined
): boolean {
  const isActivityRecent =
    lastActivityAt !== null &&
    Date.now() - lastActivityAt < ACTIVITY_TIMEOUT_MS;

  // Optimistic: assume fresh unless we can prove the session is stale or future.
  let isSessionFresh = true;
  if (sessionStartDate) {
    const start = new Date(sessionStartDate).getTime();
    if (!isNaN(start)) {
      const elapsed = Date.now() - start;
      isSessionFresh = elapsed >= 0 && elapsed < GRACE_PERIOD_MS;
    }
  }

  // Skip session freshness check in dev so replay of old recordings works.
  const isDev = process.env.NODE_ENV === 'development';
  return isActivityRecent && (isDev || isSessionFresh);
}

// Isolates the per-second tick so only this hook's consumers re-render on activity checks.
export function useIsLive(): boolean {
  const lastActivityAt = useConnection((s) => s.lastActivityAt);
  const sessionStartDate = useSession((s) => s.sessionInfo?.StartDate);
  const [isLive, setIsLive] = useState(() =>
    computeIsLive(lastActivityAt, sessionStartDate)
  );

  useEffect(() => {
    const update = () =>
      setIsLive(computeIsLive(lastActivityAt, sessionStartDate));
    update();
    const id = setInterval(update, MS_PER_SECOND);
    return () => clearInterval(id);
  }, [lastActivityAt, sessionStartDate]);

  return isLive;
}
