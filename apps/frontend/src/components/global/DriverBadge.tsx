import Image from 'next/image';
import { cn } from '@/lib/utils';

interface DriverBadgeProps {
  tla: string;
  teamId: string;
  imageUrl?: string;
  className?: string;
}

export function DriverBadge({
  tla,
  teamId,
  imageUrl,
  className,
}: DriverBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-bold uppercase tracking-tight',
        className
      )}
    >
      {imageUrl ? (
        <div className="relative h-4 w-4 overflow-hidden rounded-full shrink-0 border border-border/50">
          <Image
            src={imageUrl}
            alt={tla}
            fill
            sizes="16px"
            className="object-cover object-top"
          />
        </div>
      ) : (
        <span
          className={cn('h-2 w-2 rounded-full shrink-0', `bg-team-${teamId}`)}
        />
      )}
      {tla}
    </span>
  );
}
