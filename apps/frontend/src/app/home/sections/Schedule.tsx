import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const sessionLabels: Record<string, string> = {
  fp1: 'Practice 1',
  fp2: 'Practice 2',
  fp3: 'Practice 3',
  sprintQualy: 'Sprint Shootout',
  sprint: 'Sprint',
  qualy: 'Qualifying',
  race: 'Race',
};

interface ScheduleProps {
  sessionEntries: [string, string][];
}

export function Schedule({ sessionEntries }: ScheduleProps) {
  return (
    <section id="schedule" className="w-full relative z-10 py-20 px-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-4 mb-10 opacity-70">
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Event Schedule
          </h2>
          <Separator className="flex-1 bg-border/40" />
        </div>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {sessionEntries.map(([key, iso]) => {
            const date = new Date(iso);
            const isPast = date < new Date();
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div
                key={key}
                className={cn(
                  'flex items-center justify-between rounded-2xl border p-6 transition-all duration-300',
                  isPast
                    ? 'border-transparent bg-transparent opacity-50 grayscale-50'
                    : 'border-border/60 bg-card/80 shadow-sm backdrop-blur-sm hover:border-foreground/30 hover:shadow-md hover:bg-card hover:-translate-y-0.5',
                  isToday &&
                    !isPast &&
                    'border-foreground/30 bg-foreground/10 shadow-md ring-1 ring-foreground/20'
                )}
              >
                <div className="flex flex-col gap-1.5 pt-1">
                  <p className="text-base font-semibold text-foreground tracking-tight">
                    {sessionLabels[key] || key}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isToday && !isPast && (
                      <span className="flex h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                    )}
                    <span className="font-mono text-lg font-medium text-foreground tabular-nums">
                      {date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
