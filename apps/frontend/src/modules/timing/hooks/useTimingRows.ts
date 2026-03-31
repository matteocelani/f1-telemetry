import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SEGMENT_STATUS } from '@f1-telemetry/core';
import type {
  SectorTime,
  StintData,
  SpeedEntry,
  QualifyingStats,
  DriverTiming,
} from '@f1-telemetry/core';
import { NO_POSITION } from '@/constants/numbers';
import driversData from '@/data/drivers.json';
import teamsData from '@/data/teams.json';
import { QUALIFYING_SESSION_TYPES } from '@/modules/timing/constants';
import type {
  UITimingRow,
  UISector,
  UIDriverSpeeds,
  UISpeedEntry,
  UIStint,
  SectorColorClass,
  SegmentColorClass,
  TimingRowsResult,
} from '@/modules/timing/types';
import { lapTimeToMs } from '@/modules/timing/utils';
import { useSession } from '@/store/session';
import { useTiming } from '@/store/timing';
import { useTimingApp } from '@/store/timing-app';
import type { DriverMeta, TeamsMap } from '@/types/data';

const staticDrivers = driversData as unknown as DriverMeta[];
const teams = teamsData as unknown as TeamsMap;

const SECTOR_INDICES = ['0', '1', '2'] as const;
const EMPTY_SECTOR: UISector = {
  value: '',
  previousValue: '',
  color: 'none',
  segments: [],
};
const EMPTY_SPEED: UISpeedEntry = { value: '', color: 'none' };
const EMPTY_SPEEDS: UIDriverSpeeds = {
  fl: EMPTY_SPEED,
  st: EMPTY_SPEED,
  i1: EMPTY_SPEED,
  i2: EMPTY_SPEED,
};

function resolveSectorColor(
  value: string | undefined,
  isPersonalBest: boolean | undefined,
  isOverallBest: boolean | undefined
): SectorColorClass {
  if (!value) return 'none';
  if (isOverallBest) return 'purple';
  if (isPersonalBest) return 'green';
  return 'yellow';
}

function resolveSegmentColor(status: number): SegmentColorClass {
  switch (status) {
    case SEGMENT_STATUS.PURPLE:
      return 'purple';
    case SEGMENT_STATUS.GREEN:
      return 'green';
    case SEGMENT_STATUS.YELLOW:
      return 'yellow';
    case SEGMENT_STATUS.STOPPED:
      return 'red';
    default:
      return 'none';
  }
}

function buildSector(sector: SectorTime | undefined): UISector {
  if (!sector) return EMPTY_SECTOR;

  const color = resolveSectorColor(
    sector.Value,
    sector.PersonalFastest,
    sector.OverallFastest
  );

  const segments: SegmentColorClass[] = [];
  if (sector.Segments) {
    const keys = Object.keys(sector.Segments).sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10)
    );
    for (const key of keys) {
      segments.push(resolveSegmentColor(sector.Segments[key].Status));
    }
  }

  return {
    value: sector.Value ?? '',
    previousValue: sector.PreviousValue ?? '',
    color,
    segments,
  };
}

function buildSpeedEntry(entry: SpeedEntry | undefined): UISpeedEntry {
  if (!entry?.Value) return EMPTY_SPEED;
  return {
    value: entry.Value,
    color: resolveSectorColor(
      entry.Value,
      entry.PersonalFastest,
      entry.OverallFastest
    ),
  };
}

function buildSpeeds(
  timing:
    | {
        Speeds?: {
          FL?: SpeedEntry;
          ST?: SpeedEntry;
          I1?: SpeedEntry;
          I2?: SpeedEntry;
        };
      }
    | undefined
): UIDriverSpeeds {
  if (!timing?.Speeds) return EMPTY_SPEEDS;
  const s = timing.Speeds;
  return {
    fl: buildSpeedEntry(s.FL),
    st: buildSpeedEntry(s.ST),
    i1: buildSpeedEntry(s.I1),
    i2: buildSpeedEntry(s.I2),
  };
}

function buildStintHistory(
  stintsRaw: Record<string, StintData> | undefined
): UIStint[] {
  if (!stintsRaw) return [];
  return Object.keys(stintsRaw)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => ({
      compound: stintsRaw[key].Compound ?? 'UNKNOWN',
      isNew: stintsRaw[key].New ?? false,
      totalLaps: stintsRaw[key].TotalLaps ?? 0,
      startLap: stintsRaw[key].StartLaps ?? 0,
    }));
}

// Infers qualifying part from knocked-out count — more reliable than waiting for SessionPart in stream.
// noEntries = [22, 16, 10]: q2Threshold=6 KO → Q2, q3Threshold=12 KO → Q3.
function inferSessionPart(
  knockedOutCount: number,
  noEntries: number[]
): number {
  if (noEntries.length < 3) return 1;
  const q2Threshold = noEntries[0] - noEntries[1];
  const q3Threshold = noEntries[0] - noEntries[2];
  if (knockedOutCount >= q3Threshold) return 3;
  if (knockedOutCount >= q2Threshold) return 2;
  return 1;
}

// Stats format varies between delta frames (keyed object) and full snapshots (array).
function getQualifyingStats(
  timing: DriverTiming | undefined,
  partIndex: number
): QualifyingStats | undefined {
  const stats = timing?.Stats;
  if (!stats) return undefined;
  if (Array.isArray(stats)) return stats[partIndex];
  return stats[String(partIndex)];
}

// BestLapTimes key with the highest index and a populated Value = last part the driver ran.
function getKnockoutPartIndex(timing: DriverTiming | undefined): number {
  const blts = timing?.BestLapTimes;
  if (!blts) return 0;
  let maxIdx = 0;
  for (const [key, val] of Object.entries(blts)) {
    const idx = parseInt(key, 10);
    if (!isNaN(idx) && val?.Value && idx > maxIdx) maxIdx = idx;
  }
  return maxIdx;
}

// Cross-part fallback excluded for active drivers; using a prior Q time violates FIA B2.4.3 sort order.
function resolveQualifyingBestLap(
  timing: DriverTiming | undefined,
  isKnockedOut: boolean,
  koPartIndex: number
): string {
  if (!isKnockedOut) return timing?.BestLapTime?.Value ?? '';
  return timing?.BestLapTimes?.[String(koPartIndex)]?.Value ?? '';
}

// FIA B2.4.3 order: active-timed (0) → active-no-time (1) → KO by elimination part (N≥2).
// effectiveSessionPart - koPartIndex maps later-eliminated drivers to lower group numbers.
function getQualifyingGroup(
  row: UITimingRow,
  koPartIndices: Record<string, number>,
  effectiveSessionPart: number
): number {
  if (!row.isKnockedOut) return row.bestLap !== '' ? 0 : 1;
  const koPartIndex = koPartIndices[row.driverNo] ?? 0;
  return effectiveSessionPart - koPartIndex;
}

// Parses F1 gap strings ("+12.345", "1L", "2L", "") into a numeric value for sorting.
// Lap gaps are converted to a large number so they sort below time-based gaps.
const SECONDS_PER_LAP_GAP = 120;
function parseGapToNumber(gap: string): number {
  if (!gap) return Infinity;
  const lapMatch = gap.match(/^(\d+)L$/);
  if (lapMatch) return parseInt(lapMatch[1], 10) * SECONDS_PER_LAP_GAP;
  const cleaned = gap.replace(/[^0-9.]/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) ? Infinity : value;
}

// Counts the furthest completed micro-sector across all 3 sectors (0-based cumulative index).
// A segment is "completed" when its color is not 'none'. More segments = physically further ahead.
function countCompletedSegments(row: UITimingRow): number {
  let count = 0;
  for (const sector of row.sectors) {
    for (const seg of sector.segments) {
      if (seg !== 'none') count++;
    }
  }
  return count;
}

// Merges driverList + timing into sorted UI rows. Skeleton state until data arrives.
export function useTimingRows(): TimingRowsResult {
  const lines = useTiming(useShallow((s) => s.lines));
  const driverList = useTiming(useShallow((s) => s.driverList));
  const sessionPart = useTiming((s) => s.sessionPart);
  const noEntries = useTiming(useShallow((s) => s.noEntries));
  const knockedOutParts = useTiming(useShallow((s) => s.knockedOutParts));
  const retiredDrivers = useTiming((s) => s.retiredDrivers);
  const appLines = useTimingApp(useShallow((s) => s.lines));
  const sessionInfo = useSession((s) => s.sessionInfo);

  return useMemo(() => {
    const isQualifying = QUALIFYING_SESSION_TYPES.includes(
      sessionInfo?.Type as (typeof QUALIFYING_SESSION_TYPES)[number]
    );

    const knockedOutCount = Object.values(lines).filter(
      (t) => t.KnockedOut
    ).length;
    // Use knock-out count as primary source; falls back to stream value if noEntries unavailable.
    const effectiveSessionPart =
      isQualifying && noEntries.length >= 3
        ? inferSessionPart(knockedOutCount, noEntries)
        : sessionPart;
    // Always start from static drivers (22 entries) so the list is complete on first render
    const allDriverNos = new Set(staticDrivers.map((d) => d.driverNumber));
    for (const no of Object.keys(driverList)) allDriverNos.add(no);
    for (const no of Object.keys(lines)) allDriverNos.add(no);

    const rows: UITimingRow[] = [];
    // Built during the row loop; used by getQualifyingGroup to distinguish Q1-KO from Q2-KO.
    // Primary source: knockedOutParts store (accurate for live KO transitions).
    // Fallback: getKnockoutPartIndex via BestLapTimes (handles session snapshots/replays).
    const koPartIndices: Record<string, number> = {};

    for (const driverNo of allDriverNos) {
      const timing = lines[driverNo];
      const wsDriver = driverList[driverNo];
      const staticDriver = staticDrivers.find(
        (d) => d.driverNumber === driverNo
      );
      const appData = appLines[driverNo];

      const tla = wsDriver?.Tla ?? staticDriver?.tla ?? driverNo;
      const teamId = staticDriver?.teamId ?? 'unknown';
      const teamColor = wsDriver?.TeamColour
        ? `#${wsDriver.TeamColour}`
        : (teams[teamId]?.colorHex ?? '#888888');

      // Stints arrives as a keyed object from the WS delta merge, not a true array.
      const stintsRaw = appData?.Stints as unknown as
        | Record<string, StintData>
        | undefined;
      const lastStintKey = stintsRaw
        ? Object.keys(stintsRaw).sort((a, b) => Number(b) - Number(a))[0]
        : undefined;
      const lastStint =
        lastStintKey !== undefined ? stintsRaw?.[lastStintKey] : undefined;

      const rawPosition = timing ? parseInt(timing.Position, 10) : NaN;
      const hasPosition = !isNaN(rawPosition) && rawPosition > 0;

      const sectors = timing
        ? SECTOR_INDICES.map((idx) => buildSector(timing.Sectors?.[idx]))
        : [EMPTY_SECTOR, EMPTY_SECTOR, EMPTY_SECTOR];

      const lastLapColor = timing
        ? resolveSectorColor(
            timing.LastLapTime?.Value,
            timing.LastLapTime?.PersonalFastest,
            timing.LastLapTime?.OverallFastest
          )
        : 'none';

      // In qualifying, gap/interval come from per-part Stats (0-indexed), not GapToLeader/IntervalToPositionAhead.
      const isKnockedOut = timing?.KnockedOut ?? false;
      const partIndex = effectiveSessionPart - 1;
      const koPartIndex =
        isQualifying && isKnockedOut
          ? driverNo in knockedOutParts
            ? knockedOutParts[driverNo]
            : getKnockoutPartIndex(timing)
          : 0;
      if (isQualifying && isKnockedOut) koPartIndices[driverNo] = koPartIndex;
      // KO drivers use their elimination-part stats; active drivers use the current-part stats.
      const statsIndex = isQualifying
        ? isKnockedOut
          ? koPartIndex
          : partIndex
        : 0;
      const qualiStats = isQualifying
        ? getQualifyingStats(timing, statsIndex)
        : undefined;
      const gap = isQualifying
        ? (qualiStats?.TimeDiffToFastest ?? '')
        : (timing?.GapToLeader ?? '');
      const interval = isQualifying
        ? (qualiStats?.TimeDifftoPositionAhead ?? '')
        : (timing?.IntervalToPositionAhead?.Value ?? '');
      const bestLap = isQualifying
        ? resolveQualifyingBestLap(timing, isKnockedOut, koPartIndex)
        : (timing?.BestLapTime?.Value ?? '');

      rows.push({
        driverNo,
        position: hasPosition ? rawPosition : NO_POSITION,
        tla,
        firstName: wsDriver?.FirstName ?? staticDriver?.firstName ?? '',
        lastName: wsDriver?.LastName ?? staticDriver?.lastName ?? '',
        teamId,
        teamName: teams[teamId]?.name ?? '',
        teamColor,
        driverImageUrl: staticDriver?.imageUrl ?? '',
        carImageUrl: teams[teamId]?.carImageUrl ?? '',
        countryFlag: staticDriver?.countryFlag ?? '',
        gap,
        interval,
        isCatching: timing?.IntervalToPositionAhead?.Catching ?? false,
        lastLap: timing?.LastLapTime?.Value ?? '',
        lastLapColor,
        bestLap,
        sectors,
        isInPit: timing?.InPit ?? false,
        isPitOut: timing?.PitOut ?? false,
        isRetired: retiredDrivers.has(driverNo),
        currentTyre: lastStint?.Compound ?? 'UNKNOWN',
        isNewTyre: lastStint?.New ?? false,
        tyreAge: lastStint?.TotalLaps ?? 0,
        numberOfPitStops: timing?.NumberOfPitStops ?? 0,
        numberOfLaps: timing?.NumberOfLaps ?? 0,
        isKnockedOut,
        speeds: buildSpeeds(timing),
        stintHistory: buildStintHistory(stintsRaw),
      });
    }

    if (isQualifying) {
      rows.sort((a, b) => {
        const groupA = getQualifyingGroup(
          a,
          koPartIndices,
          effectiveSessionPart
        );
        const groupB = getQualifyingGroup(
          b,
          koPartIndices,
          effectiveSessionPart
        );
        if (groupA !== groupB) return groupA - groupB;
        // Group 1 (active, no current-part time): stable TLA fallback per FIA B2.4.3 a v.
        if (groupA === 1) return a.tla.localeCompare(b.tla);
        // All other groups: sort by the time already resolved in bestLap.
        return (
          lapTimeToMs(a.bestLap) - lapTimeToMs(b.bestLap) ||
          a.tla.localeCompare(b.tla)
        );
      });
      // Assign sequential positions to eliminate server-side duplicates/gaps.
      const remapped = rows.map((row, idx) => ({ ...row, position: idx + 1 }));
      // Cutoff: noEntries[effectiveSessionPart] drivers advance; those after are in danger zone.
      const eliminationPos =
        noEntries.length > effectiveSessionPart
          ? noEntries[effectiveSessionPart]
          : null;
      return {
        rows: remapped,
        sessionPart: effectiveSessionPart,
        eliminationPos,
        isQualifying: true,
      };
    }

    rows.sort((a, b) => {
      // Retired drivers always sort to the bottom, ordered by laps completed (FIA B2.5.5).
      if (a.isRetired !== b.isRetired) return a.isRetired ? 1 : -1;
      if (a.isRetired && b.isRetired) {
        if (a.numberOfLaps !== b.numberOfLaps) return b.numberOfLaps - a.numberOfLaps;
        return parseInt(a.driverNo, 10) - parseInt(b.driverNo, 10);
      }
      // 1st key: F1 Position
      if (a.position !== NO_POSITION && b.position !== NO_POSITION) {
        if (a.position !== b.position) return a.position - b.position;
        // Tie-breaker for duplicate positions (transient F1 delta sync issue)
        const gapA = parseGapToNumber(a.gap);
        const gapB = parseGapToNumber(b.gap);
        if (gapA !== gapB) return gapA - gapB;
        if (a.numberOfLaps !== b.numberOfLaps) return b.numberOfLaps - a.numberOfLaps;
        // Same lap: driver with more completed micro-sectors is physically ahead.
        const segsA = countCompletedSegments(a);
        const segsB = countCompletedSegments(b);
        if (segsA !== segsB) return segsB - segsA;
        return parseInt(a.driverNo, 10) - parseInt(b.driverNo, 10);
      }
      if (a.position !== NO_POSITION) return -1;
      if (b.position !== NO_POSITION) return 1;
      return parseInt(a.driverNo, 10) - parseInt(b.driverNo, 10);
    });

    // Remap to clean 1-22 sequence to eliminate F1 positional collisions from the UI.
    const remapped = rows.map((row, idx) => ({ ...row, position: idx + 1 }));

    return {
      rows: remapped,
      sessionPart: effectiveSessionPart,
      eliminationPos: null,
      isQualifying: false,
    };
  }, [
    lines,
    driverList,
    appLines,
    sessionPart,
    noEntries,
    sessionInfo,
    knockedOutParts,
    retiredDrivers,
  ]);
}
