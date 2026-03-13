import type { TyreCompound } from '@f1-telemetry/core';

export type SectorColorClass = 'purple' | 'green' | 'yellow' | 'none';

export interface UITimingRow {
  driverNo: string;
  position: number;
  tla: string;
  firstName: string;
  lastName: string;
  teamId: string;
  imageUrl?: string;
  gap: string;
  interval: string;
  lastLap: string;
  bestLap: string;
  sectorColors: Record<string, SectorColorClass>;
  isInPit: boolean;
  isPitOut: boolean;
  currentTyre: TyreCompound;
  tyreAge: number;
  numberOfPitStops: number;
  numberOfLaps: number;
  isKnockedOut: boolean;
}
