/**
 * Pure parsing and selection over the F1 season index. Deliberately free of
 * imports so it can be unit-tested under `node --test`.
 */

export interface ArchiveSession {
  meetingName: string;
  meetingSlug: string;
  location: string;
  countryName: string;
  sessionName: string;
  round: number;
  startDate: string;
  path: string;
}

export interface SelectOptions {
  name?: string;
  round?: number;
  all?: boolean;
  sprint?: boolean;
  sprints?: boolean;
}

interface RawSession {
  Name?: string;
  Type?: string;
  StartDate?: string;
  Path?: string;
}

interface RawMeeting {
  Name?: string;
  Location?: string;
  Country?: { Name?: string };
  Sessions?: RawSession[];
}

interface RawIndex {
  Meetings?: RawMeeting[];
}

const RACE_SESSION = 'Race';
const SPRINT_SESSION = 'Sprint';

export function slugify(meetingName: string): string {
  return meetingName
    .replace(/\s*Grand Prix\s*/i, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseSeasonIndex(json: string): ArchiveSession[] {
  const parsed = JSON.parse(json.replace(/^﻿/, '')) as RawIndex;
  const meetings = parsed.Meetings ?? [];

  // A meeting counts as a round only if it has a Race session, which excludes
  // pre-season testing. The Number field in the feed is unreliable (duplicated
  // and out of order), so rounds are derived from the race date instead.
  const rounds = meetings
    .map((meeting) => ({
      meeting,
      race: (meeting.Sessions ?? []).find((s) => s.Name === RACE_SESSION && s.Path),
    }))
    .filter((entry): entry is { meeting: RawMeeting; race: RawSession } =>
      Boolean(entry.race)
    )
    .sort((a, b) =>
      String(a.race.StartDate ?? '').localeCompare(String(b.race.StartDate ?? ''))
    );

  const sessions: ArchiveSession[] = [];

  rounds.forEach(({ meeting }, position) => {
    const meetingName = meeting.Name ?? '';

    for (const session of meeting.Sessions ?? []) {
      if (session.Name !== RACE_SESSION && session.Name !== SPRINT_SESSION) continue;
      if (!session.Path) continue;

      sessions.push({
        meetingName,
        meetingSlug: slugify(meetingName),
        location: meeting.Location ?? '',
        countryName: meeting.Country?.Name ?? '',
        sessionName: session.Name,
        round: position + 1,
        startDate: session.StartDate ?? '',
        path: session.Path,
      });
    }
  });

  return sessions;
}

export function selectSessions(
  sessions: ArchiveSession[],
  options: SelectOptions
): ArchiveSession[] {
  const wanted = options.sprint ? SPRINT_SESSION : RACE_SESSION;

  if (options.all) {
    const included = options.sprints
      ? [RACE_SESSION, SPRINT_SESSION]
      : [RACE_SESSION];
    return sessions
      .filter((s) => included.includes(s.sessionName))
      .sort((a, b) => a.round - b.round || a.startDate.localeCompare(b.startDate));
  }

  if (options.round !== undefined) {
    return sessions.filter(
      (s) => s.round === options.round && s.sessionName === wanted
    );
  }

  if (options.name) {
    const needle = options.name.toLowerCase();
    return sessions.filter(
      (s) =>
        s.sessionName === wanted &&
        (s.meetingName.toLowerCase().includes(needle) ||
          s.meetingSlug.includes(needle) ||
          s.location.toLowerCase().includes(needle) ||
          s.countryName.toLowerCase().includes(needle))
    );
  }

  return [];
}
