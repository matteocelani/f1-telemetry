import { useCallback } from 'react';
import { delayBuffer } from '@/ws/wsBuffer';

const MIN_DELAY_SECONDS = 0;
const MAX_DELAY_SECONDS = 60;

/**
 * Hook exposing stream delay controls for TV-sync.
 * The actual buffer lives outside React; this hook provides a React-friendly API.
 */
export function useStreamDelay() {
  const setDelay = useCallback((seconds: number) => {
    const clamped = Math.max(
      MIN_DELAY_SECONDS,
      Math.min(MAX_DELAY_SECONDS, seconds)
    );
    delayBuffer.setDelay(clamped);
  }, []);

  const getDelay = useCallback(() => {
    return delayBuffer.getDelaySeconds();
  }, []);

  return { setDelay, getDelay };
}
