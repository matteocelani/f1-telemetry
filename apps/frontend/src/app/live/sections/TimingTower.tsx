'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DriverRow } from '@/app/live/components/DriverRow';
import { DriverRowExpanded } from '@/app/live/components/DriverRowExpanded';
import { ROW_EXPAND_DURATION, ROW_LAYOUT_DURATION } from '@/constants/numbers';
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';

const H =
  'text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-help';

const COLUMN_HELP = {
  POS: 'Race position',
  DRV: 'Driver and team',
  TYRE: 'Compound and age',
  INT: 'Interval and gap',
  LAST: 'Last lap and best lap',
  SEC: 'Purple = overall, Green = personal, Yellow = normal',
  S1: 'Sector 1, previous, dots',
  S2: 'Sector 2, previous, dots',
  S3: 'Sector 3, previous, dots',
  LAPS: 'Laps, PIT/OUT/RET, 2P = 2 pits',
} as const;

interface TimingTowerProps {
  className?: string;
}

function ColumnHeader({
  label,
  tip,
  className,
}: {
  label: string;
  tip: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Tooltip open={isOpen} onOpenChange={setIsOpen}>
      <TooltipTrigger asChild>
        <span
          className={cn(H, className)}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-56">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

export function TimingTower({ className }: TimingTowerProps) {
  const { rows, isDetailedView, eliminationPos } = useLiveTiming();
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const isExpanded = expandedDriver !== null;

  const handleToggle = useCallback((driverNo: string) => {
    setExpandedDriver((prev) => (prev === driverNo ? null : driverNo));
  }, []);

  return (
    <div className={cn('flex flex-col overflow-x-auto', className)}>
      <div className="flex min-w-fit flex-col flex-1 min-h-0">
        {/* Header */}
        <TooltipProvider>
          <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-card px-2 py-1.5 md:gap-3 md:px-3">
            <ColumnHeader
              label="POS"
              tip={COLUMN_HELP.POS}
              className="w-7 shrink-0 md:w-8"
            />
            <ColumnHeader
              label="DRV"
              tip={COLUMN_HELP.DRV}
              className="w-10 shrink-0 text-center md:w-12"
            />
            <ColumnHeader
              label="TYRE"
              tip={COLUMN_HELP.TYRE}
              className="hidden w-16 shrink-0 md:block"
            />
            <ColumnHeader
              label="INT"
              tip={COLUMN_HELP.INT}
              className="min-w-14 flex-1 shrink-0 text-right md:min-w-20"
            />
            <ColumnHeader
              label="GAP"
              tip="Gap to leader"
              className="hidden min-w-16 flex-1 shrink-0 text-right md:block lg:hidden"
            />
            <ColumnHeader
              label="LAST"
              tip={COLUMN_HELP.LAST}
              className="min-w-14 flex-1 shrink-0 text-right md:min-w-24"
            />
            <ColumnHeader
              label="SEC"
              tip={COLUMN_HELP.SEC}
              className={cn(
                'w-10 shrink-0 text-center',
                isDetailedView ? 'hidden' : 'hidden md:block xl:hidden'
              )}
            />
            <ColumnHeader
              label="S1"
              tip={COLUMN_HELP.S1}
              className={cn(
                'min-w-24 flex-1 shrink-0 pl-3',
                isDetailedView ? 'block' : 'hidden xl:block'
              )}
            />
            <ColumnHeader
              label="S2"
              tip={COLUMN_HELP.S2}
              className={cn(
                'min-w-24 flex-1 shrink-0 pl-3',
                isDetailedView ? 'block' : 'hidden xl:block'
              )}
            />
            <ColumnHeader
              label="S3"
              tip={COLUMN_HELP.S3}
              className={cn(
                'min-w-24 flex-1 shrink-0 pl-3',
                isDetailedView ? 'block' : 'hidden xl:block'
              )}
            />
            <ColumnHeader
              label="LAPS"
              tip={COLUMN_HELP.LAPS}
              className="w-9 shrink-0 text-center md:w-12"
            />
          </div>
        </TooltipProvider>

        {/* Rows */}
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
          {rows.map((row) => (
            <motion.div
              key={row.driverNo}
              layout
              transition={{ duration: ROW_LAYOUT_DURATION }}
              className={cn('relative', !isExpanded && 'flex-1')}
            >
              <DriverRow
                row={row}
                isExpanded={expandedDriver === row.driverNo}
                onToggle={() => handleToggle(row.driverNo)}
                detailed={isDetailedView}
              />
              <AnimatePresence>
                {expandedDriver === row.driverNo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: ROW_EXPAND_DURATION }}
                    className="overflow-hidden pb-3"
                  >
                    <DriverRowExpanded row={row} />
                  </motion.div>
                )}
              </AnimatePresence>
              {eliminationPos !== null && row.position === eliminationPos && (
                <div className="relative h-0">
                  <div className="absolute inset-x-0 top-0 flex -translate-y-1/2 items-center gap-2 px-2">
                    <div className="h-px flex-1 border-t border-dashed border-red-500/50" />
                    <span className="shrink-0 bg-background px-1 text-2xs font-bold uppercase tracking-widest text-red-500/70">
                      ELIM
                    </span>
                    <div className="h-px flex-1 border-t border-dashed border-red-500/50" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
