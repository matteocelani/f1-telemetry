import { cn } from '@/lib/utils';

interface TeamColorLineProps {
  teamId: string;
  className?: string;
}

export function TeamColorLine({ teamId, className }: TeamColorLineProps) {
  return (
    <div
      className={cn(
        'h-full w-1 rounded-full shrink-0',
        `bg-team-${teamId}`,
        className
      )}
    />
  );
}
