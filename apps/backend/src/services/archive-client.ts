import { Logger } from '@utils/logger';

const ARCHIVE_BASE_URL = 'https://livetiming.formula1.com/static';
const ARCHIVE_HEADERS = { 'User-Agent': 'BestHTTP' } as const;

// The archive answers 403 rather than 404 for keys that do not exist, so both
// statuses mean "this file was never published for this session".
const ABSENT_STATUSES: ReadonlySet<number> = new Set([403, 404]);

// Channel files to pull for a session, mapped to the channel names the frontend
// matches on. The .z suffix is retained: CHANNELS.POSITION is 'Position.z'.
export const ARCHIVE_CHANNEL_FILES: ReadonlyArray<{
  file: string;
  channel: string;
  required: boolean;
}> = [
  { file: 'TimingData.jsonStream', channel: 'TimingData', required: true },
  { file: 'TimingAppData.jsonStream', channel: 'TimingAppData', required: false },
  { file: 'TimingStats.jsonStream', channel: 'TimingStats', required: false },
  { file: 'TrackStatus.jsonStream', channel: 'TrackStatus', required: false },
  {
    file: 'RaceControlMessages.jsonStream',
    channel: 'RaceControlMessages',
    required: false,
  },
  { file: 'WeatherData.jsonStream', channel: 'WeatherData', required: false },
  { file: 'DriverList.jsonStream', channel: 'DriverList', required: false },
  { file: 'SessionData.jsonStream', channel: 'SessionData', required: false },
  { file: 'LapCount.jsonStream', channel: 'LapCount', required: false },
  {
    file: 'ExtrapolatedClock.jsonStream',
    channel: 'ExtrapolatedClock',
    required: false,
  },
  { file: 'Position.z.jsonStream', channel: 'Position.z', required: false },
  { file: 'CarData.z.jsonStream', channel: 'CarData.z', required: false },
];

async function fetchText(url: string): Promise<string | null> {
  let response: Response;

  try {
    response = await fetch(url, { headers: ARCHIVE_HEADERS });
  } catch (error) {
    throw new Error(`Network failure fetching ${url}`, { cause: error });
  }

  if (ABSENT_STATUSES.has(response.status)) return null;

  if (!response.ok) {
    throw new Error(`Archive request failed for ${url} — HTTP ${response.status}`);
  }

  return response.text();
}

export async function fetchSeasonIndex(year: number): Promise<string> {
  const url = `${ARCHIVE_BASE_URL}/${year}/Index.json`;
  const text = await fetchText(url);

  if (text === null) {
    throw new Error(`No archive index published for ${year}`);
  }

  return text;
}

export async function fetchSessionInfo(sessionPath: string): Promise<unknown> {
  const url = `${ARCHIVE_BASE_URL}/${sessionPath}SessionInfo.json`;
  const text = await fetchText(url);

  if (text === null) {
    throw new Error(`SessionInfo.json missing for ${sessionPath}`);
  }

  try {
    return JSON.parse(text.replace(/^﻿/, '')) as unknown;
  } catch (error) {
    throw new Error(`SessionInfo.json is not valid JSON for ${sessionPath}`, {
      cause: error,
    });
  }
}

// Returns null when an optional channel is absent so the caller can skip it.
export async function fetchChannelFile(
  sessionPath: string,
  file: string
): Promise<string | null> {
  const text = await fetchText(`${ARCHIVE_BASE_URL}/${sessionPath}${file}`);

  if (text === null) {
    Logger.warn(`Channel file not published: ${sessionPath}${file}`);
  }

  return text;
}
