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
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';

const H =
  'text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-help';

const COLUMN_HELP = {
  POS: 'Race position',
  DRV: 'Driver · Team',
  TYRE: 'Compound · Age',
  INT: 'Interval · Gap',
  LAST: 'Last lap · Best lap',
  SEC: '🟣 Overall · 🟢 Personal · 🟡 Normal',
  S1: 'Sector 1 · Previous · Dots',
  S2: 'Sector 2 · Previous · Dots',
  S3: 'Sector 3 · Previous · Dots',
  LAPS: 'Laps · PIT/OUT/RET · 2P = 2 pits',
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
  const { rows, isDetailedView } = useLiveTiming();
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
          <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-1.5">
            <ColumnHeader
              label="POS"
              tip={COLUMN_HELP.POS}
              className="w-8 shrink-0"
            />
            <ColumnHeader
              label="DRV"
              tip={COLUMN_HELP.DRV}
              className="w-12 shrink-0 text-center"
            />
            <ColumnHeader
              label="TYRE"
              tip={COLUMN_HELP.TYRE}
              className="w-16 shrink-0"
            />
            <ColumnHeader
              label="INT"
              tip={COLUMN_HELP.INT}
              className="min-w-20 flex-1 shrink-0 text-right"
            />
            <ColumnHeader
              label="LAST"
              tip={COLUMN_HELP.LAST}
              className="min-w-16 md:min-w-24 flex-1 shrink-0 text-right"
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
              className="w-12 shrink-0 text-center"
            />
          </div>
        </TooltipProvider>

        {/* Rows */}
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
          {rows.map((row) => (
            <motion.div
              key={row.driverNo}
              layout
              transition={{ duration: 0.3 }}
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
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pb-3"
                  >
                    <DriverRowExpanded row={row} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
