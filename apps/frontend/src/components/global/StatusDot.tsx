import { cn } from '@/lib/utils';

type StatusVariant = 'connected' | 'disconnected' | 'reconnecting' | 'live';

interface StatusDotProps {
  variant: StatusVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  connected: 'bg-f1-sector-green',
  disconnected: 'bg-destructive',
  reconnecting: 'bg-f1-tyre-medium animate-pulse',
  live: 'bg-primary animate-pulse',
};

export function StatusDot({ variant, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full shrink-0',
        VARIANT_CLASSES[variant],
        className
      )}
    />
  );
}
