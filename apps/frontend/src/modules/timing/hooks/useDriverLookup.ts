import { useMemo } from 'react';
import driversData from '@/data/drivers.json';
import teamsData from '@/data/teams.json';
import type { DriverMeta, TeamsMap } from '@/types/data';

const staticDrivers = driversData as unknown as DriverMeta[];
const teams = teamsData as unknown as TeamsMap;

export interface DriverTag {
  driverNo: string;
  tla: string;
  teamColor: string;
}

const DRIVER_MAP = new Map<string, DriverTag>(
  staticDrivers.map((d) => [
    d.driverNumber,
    {
      driverNo: d.driverNumber,
      tla: d.tla,
      teamColor: teams[d.teamId]?.colorHex ?? '#666666',
    },
  ])
);

export function useDriverLookup(): Map<string, DriverTag> {
  return useMemo(() => DRIVER_MAP, []);
}
