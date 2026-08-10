/**
 * Downloads a completed session from the F1 static archive and writes it as
 * ReplayFrame JSON for `pnpm dev:replay`.
 *
 * Usage:
 *   pnpm archive --list
 *   pnpm archive monaco
 *   pnpm archive --round 6
 *   pnpm archive chinese --sprint
 *   pnpm archive --all [--sprints]
 *   pnpm archive monaco --out ./somewhere
 */

import { mkdirSync, renameSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import {
  ARCHIVE_CHANNEL_FILES,
  fetchChannelFile,
  fetchSeasonIndex,
  fetchSessionInfo,
} from '@services/archive-client';
import {
  buildFrames,
  parseStream,
  type ChannelStream,
} from '@services/archive-converter';
import {
  parseSeasonIndex,
  selectSessions,
  type ArchiveSession,
  type SelectOptions,
} from '@services/archive-index';
import { Logger } from '@utils/logger';

const SEASON_YEAR = 2026;
const DEFAULT_OUT_DIR = resolve(__dirname, '../data');
const BYTES_PER_MB = 1024 * 1024;

interface CliOptions extends SelectOptions {
  list: boolean;
  outDir: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    list: false,
    outDir: DEFAULT_OUT_DIR,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--list') {
      options.list = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--sprint') {
      options.sprint = true;
    } else if (arg === '--sprints') {
      options.sprints = true;
    } else if (arg === '--round') {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value)) {
        throw new Error('--round requires an integer, e.g. --round 6');
      }
      options.round = value;
    } else if (arg === '--out') {
      const value = argv[++i];
      if (!value) throw new Error('--out requires a directory path');
      options.outDir = resolve(process.cwd(), value);
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      options.name = arg;
    }
  }

  return options;
}

function outputPath(session: ArchiveSession, outDir: string): string {
  const date = session.startDate.slice(0, 10);
  const kind = session.sessionName.toLowerCase();
  return resolve(outDir, `${date}_${session.meetingSlug}_${kind}.json`);
}

async function convertSession(
  session: ArchiveSession,
  outDir: string
): Promise<void> {
  Logger.info(`Fetching ${session.meetingName} ${session.sessionName}...`);

  const sessionInfo = await fetchSessionInfo(session.path);
  const streams: ChannelStream[] = [];
  let skippedTotal = 0;

  for (const { file, channel, required } of ARCHIVE_CHANNEL_FILES) {
    const text = await fetchChannelFile(session.path, file);

    if (text === null) {
      if (required) {
        throw new Error(`Required channel ${file} missing for ${session.path}`);
      }
      continue;
    }

    const { entries, skipped } = parseStream(text);
    skippedTotal += skipped;
    if (entries.length > 0) streams.push({ channel, entries });
  }

  if (skippedTotal > 0) {
    Logger.warn(`Skipped ${skippedTotal} malformed lines`);
  }

  const frames = buildFrames(streams, sessionInfo);
  const target = outputPath(session, outDir);
  const json = JSON.stringify(frames);

  mkdirSync(dirname(target), { recursive: true });
  const tmpPath = `${target}.tmp`;
  writeFileSync(tmpPath, json, 'utf-8');
  renameSync(tmpPath, target);

  const sizeMb = (json.length / BYTES_PER_MB).toFixed(1);
  Logger.info(`Wrote ${frames.length} frames (${sizeMb}MB) to ${target}`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const sessions = parseSeasonIndex(await fetchSeasonIndex(SEASON_YEAR));

  if (options.list) {
    for (const session of sessions) {
      Logger.info(
        `R${String(session.round).padStart(2)} ${session.startDate.slice(0, 10)} ` +
          `${session.meetingName} — ${session.sessionName}`
      );
    }
    return;
  }

  const selected = selectSessions(sessions, options);

  if (selected.length === 0) {
    throw new Error(
      'No session matched. Try `pnpm archive --list` to see what is available.'
    );
  }

  const failures: string[] = [];

  for (const session of selected) {
    try {
      await convertSession(session, options.outDir);
    } catch (error) {
      Logger.error(`Failed ${session.meetingName} ${session.sessionName}`, error);
      failures.push(`${session.meetingName} ${session.sessionName}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`${failures.length} session(s) failed: ${failures.join(', ')}`);
  }
}

main().catch((error) => {
  Logger.error('Archive conversion failed', error);
  process.exit(1);
});
