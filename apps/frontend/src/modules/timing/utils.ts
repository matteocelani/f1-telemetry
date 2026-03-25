import { GRACE_PERIOD_MS, REGIONAL_INDICATOR_OFFSET } from '@/constants/numbers';
import { ALPHA3_TO_ALPHA2 } from '@/modules/timing/constants';
import type { RaceEntry } from '@/types/data';

export function countryFlag(code: string): string {
  if (!code) return '';
  const alpha2 =
    ALPHA3_TO_ALPHA2[code.toUpperCase()] ?? code.slice(0, 2).toUpperCase();
  return String.fromCodePoint(
    alpha2.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET,
    alpha2.charCodeAt(1) + REGIONAL_INDICATOR_OFFSET
  );
}

export function getNextSession(
  now: Date,
  races: RaceEntry[]
): { race: RaceEntry; sessionKey: string; date: Date } | null {
  for (const race of races) {
    const sessionEntries = Object.entries(race.sessions).sort(
      (a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime()
    );
    for (const [sessionKey, sessionDateStr] of sessionEntries) {
      const sessionDate = new Date(sessionDateStr);
      if (
        sessionDate > now ||
        now.getTime() - sessionDate.getTime() < GRACE_PERIOD_MS
      ) {
        return {
          race,
          sessionKey: sessionKey.toUpperCase(),
          date: sessionDate,
        };
      }
    }
  }
  return null;
}
