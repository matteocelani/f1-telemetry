import { useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  TRACK_STATUS,
  type RaceControlMessage,
  type TrackStatusCode,
} from '@f1-telemetry/core';
import {
  CRITICAL_TRACK_STATUSES,
  TOAST_CRITICAL_DURATION_MS,
  TOAST_WARNING_DURATION_MS,
} from '@/constants/numbers';
import type {
  RCBadgeVariant,
  RCIconVariant,
  UIRaceControlMessage,
} from '@/modules/timing/types';
import { useRaceControl } from '@/store/race-control';

const TRACK_STATUS_LABELS: Record<TrackStatusCode, string> = {
  '1': 'Green Flag',
  '2': 'Yellow Flag',
  '4': 'Safety Car Deployed',
  '5': 'Red Flag',
  '6': 'Virtual Safety Car',
  '7': 'VSC Ending',
};

function resolveMessageBadge(msg: RaceControlMessage): {
  badge: RCBadgeVariant;
  label: string;
} {
  if (msg.Category === 'SafetyCar') {
    return { badge: 'safetyCar', label: 'SAFETY CAR' };
  }

  if (msg.Category === 'Flag' && msg.Flag) {
    switch (msg.Flag) {
      case 'RED':
        return { badge: 'red', label: 'RED FLAG' };
      case 'YELLOW':
        return { badge: 'yellow', label: 'CAUTION' };
      case 'DOUBLE YELLOW':
        return { badge: 'yellow', label: 'DANGER' };
      case 'CHEQUERED':
        return { badge: 'chequered', label: 'FINISH' };
      case 'GREEN':
      case 'CLEAR':
        return { badge: 'green', label: 'CLEAR' };
      case 'BLACK AND WHITE':
        return { badge: 'yellow', label: 'WARNING' };
    }
  }

  if (msg.Category === 'Drs') {
    return { badge: 'green', label: 'DRS' };
  }

  return { badge: 'info', label: 'STEWARD' };
}

function resolveIcon(msg: RaceControlMessage): RCIconVariant {
  if (msg.Category === 'SafetyCar') return 'siren';

  if (msg.Category === 'Flag' && msg.Flag) {
    switch (msg.Flag) {
      case 'RED':
        return 'flag-red';
      case 'YELLOW':
      case 'DOUBLE YELLOW':
        return 'flag-yellow';
      case 'GREEN':
      case 'CLEAR':
        return 'flag-green';
      case 'CHEQUERED':
        return 'flag-chequered';
      case 'BLACK AND WHITE':
        return 'flag-bw';
    }
  }

  return 'none';
}

function toUIMessage(msg: RaceControlMessage): UIRaceControlMessage {
  const { badge, label } = resolveMessageBadge(msg);
  return {
    id: msg.Utc + msg.Message,
    utc: msg.Utc,
    lap: msg.Lap ?? null,
    message: msg.Message,
    badge,
    badgeLabel: label,
    icon: resolveIcon(msg),
  };
}

// Sorted newest-first for the feed display.
export function useRaceControlFeed(): UIRaceControlMessage[] {
  const messages = useRaceControl((s) => s.messages);
  const trackStatus = useRaceControl((s) => s.trackStatus);
  const prevStatusRef = useRef<TrackStatusCode | null>(null);
  const toastedCountRef = useRef(0);

  // Toast on critical track status changes (SC, Red Flag, VSC).
  useEffect(() => {
    const current = trackStatus?.Status ?? null;
    const prev = prevStatusRef.current;
    prevStatusRef.current = current;

    if (!current || current === prev) return;
    if (!CRITICAL_TRACK_STATUSES.includes(current)) return;

    const label = TRACK_STATUS_LABELS[current];
    if (current === TRACK_STATUS.RED) {
      toast.error(label, { duration: TOAST_CRITICAL_DURATION_MS });
    } else {
      toast.warning(label, { duration: TOAST_WARNING_DURATION_MS });
    }
  }, [trackStatus]);

  // Toast when new critical flag messages arrive.
  useEffect(() => {
    if (messages.length <= toastedCountRef.current) {
      toastedCountRef.current = messages.length;
      return;
    }

    const newMessages = messages.slice(toastedCountRef.current);
    toastedCountRef.current = messages.length;

    for (const msg of newMessages) {
      if (msg.Flag === 'RED') {
        toast.error(msg.Message, { duration: TOAST_CRITICAL_DURATION_MS });
      }
    }
  }, [messages]);

  return useMemo(() => messages.map(toUIMessage).reverse(), [messages]);
}
