'use client';

import { type ReactNode, useMemo } from 'react';
import { Flag, Siren } from 'lucide-react';
import type { DriverTag } from '@/modules/timing/hooks/useDriverLookup';
import type {
  RCBadgeVariant,
  RCIconVariant,
  UIRaceControlMessage,
} from '@/modules/timing/types';
import { cn } from '@/lib/utils';

interface RaceControlMessageProps {
  message: UIRaceControlMessage;
  driverMap: Map<string, DriverTag>;
}

const BADGE_STYLES: Record<RCBadgeVariant, string> = {
  yellow: 'bg-yellow-500 text-black',
  red: 'bg-red-600 text-white',
  green: 'bg-emerald-600 text-white',
  safetyCar: 'bg-amber-500 text-black',
  chequered: 'bg-foreground text-background',
  info: 'bg-muted-foreground/20 text-foreground',
};

const ROW_ACCENT: Partial<Record<RCBadgeVariant, string>> = {
  red: 'border-l-2 border-l-red-600 bg-red-600/8 animate-pulse',
  safetyCar: 'border-l-2 border-l-amber-500 bg-amber-500/5',
  yellow: 'border-l-2 border-l-yellow-500',
};

const ICON_CONFIG: Record<
  RCIconVariant,
  { icon: typeof Flag; className: string } | null
> = {
  'flag-red': { icon: Flag, className: 'text-red-500' },
  'flag-yellow': { icon: Flag, className: 'text-yellow-500' },
  'flag-green': { icon: Flag, className: 'text-emerald-500' },
  'flag-chequered': { icon: Flag, className: 'text-foreground' },
  'flag-bw': { icon: Flag, className: 'text-foreground' },
  siren: { icon: Siren, className: 'text-amber-500' },
  none: null,
};

const DRIVER_REF_PATTERN = /(\d{1,2})\s+\(([A-Z]{3})\)/g;

export function RaceControlMessage({
  message,
  driverMap,
}: RaceControlMessageProps) {
  const time = useMemo(() => {
    const date = new Date(message.utc);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [message.utc]);

  const parsedContent = useMemo(
    () => parseMessageContent(message.message, driverMap),
    [message.message, driverMap]
  );

  const accent = ROW_ACCENT[message.badge];
  const iconCfg = ICON_CONFIG[message.icon];

  return (
    <div className={cn('flex flex-col gap-1 px-3 py-2 md:py-2.5', accent)}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-2xs font-extrabold uppercase tracking-wider md:text-xs',
            BADGE_STYLES[message.badge]
          )}
        >
          {message.badgeLabel}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {message.lap !== null && `Lap ${message.lap} · `}
          {time}
        </span>
        {iconCfg && (
          <iconCfg.icon
            className={cn('ml-auto size-3.5 shrink-0', iconCfg.className)}
          />
        )}
      </div>

      <p className="text-xs font-medium leading-snug text-foreground xl:text-sm">
        {parsedContent}
      </p>
    </div>
  );
}

function parseMessageContent(
  text: string,
  driverMap: Map<string, DriverTag>
): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Global flag requires manual reset between calls.
  DRIVER_REF_PATTERN.lastIndex = 0;

  while ((match = DRIVER_REF_PATTERN.exec(text)) !== null) {
    const [fullMatch, driverNo, tla] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    const driver = driverMap.get(driverNo);
    if (driver) {
      parts.push(
        <span
          key={start}
          className="inline-flex items-center rounded px-1.5 align-baseline leading-normal text-xs font-bold"
          style={{
            backgroundColor: `${driver.teamColor}20`,
            color: driver.teamColor,
          }}
        >
          {driverNo} {tla}
        </span>
      );
    } else {
      parts.push(fullMatch);
    }

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
