import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFrames, parseStream, FRAME_MS } from './archive-converter.ts';

test('parses a timestamped line into ms and payload', () => {
  const result = parseStream('00:00:09.631{"a":1}');
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].tMs, 9631);
  assert.deepEqual(result.entries[0].payload, { a: 1 });
  assert.equal(result.skipped, 0);
});

test('converts hours and minutes into milliseconds', () => {
  const result = parseStream('01:02:03.004{}');
  assert.equal(result.entries[0].tMs, 3723004);
});

test('strips a leading BOM', () => {
  const result = parseStream('﻿00:01:00.000{"ok":true}');
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].tMs, 60000);
});

test('handles CRLF line endings and blank lines', () => {
  const result = parseStream('00:00:00.000{"a":1}\r\n\r\n00:00:00.200{"b":2}\r\n');
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[1].tMs, 200);
});

test('counts malformed lines as skipped instead of throwing', () => {
  const result = parseStream('garbage\n00:00:01.000{"a":1}\n00:00:02.000{oops');
  assert.equal(result.entries.length, 1);
  assert.equal(result.skipped, 2);
});

test('keeps compressed payloads as plain strings', () => {
  const result = parseStream('00:00:01.000"H4sIAAAA"');
  assert.equal(result.entries[0].payload, 'H4sIAAAA');
});

test('prepends a snapshot frame carrying SessionInfo', () => {
  const frames = buildFrames([], { Meeting: { Name: 'Test GP' } });
  assert.equal(frames[0].snapshot, true);
  assert.deepEqual(frames[0].updates, {
    SessionInfo: { Meeting: { Name: 'Test GP' } },
  });
});

test('places an entry in the frame matching its timestamp', () => {
  const frames = buildFrames(
    [{ channel: 'TrackStatus', entries: [{ tMs: 250, payload: { Status: '1' } }] }],
    undefined
  );
  // index 0 is the snapshot, so timeline frame N sits at frames[N + 1]
  assert.deepEqual(frames[1 + 2].updates, { TrackStatus: { Status: '1' } });
});

test('pads quiet periods with empty frames to preserve real-time pacing', () => {
  const frames = buildFrames(
    [
      {
        channel: 'LapCount',
        entries: [
          { tMs: 0, payload: { L: 1 } },
          { tMs: 500, payload: { L: 2 } },
        ],
      },
    ],
    undefined
  );
  assert.equal(frames.length, 1 + 6);
  assert.deepEqual(frames[1 + 1].updates, {});
  assert.deepEqual(frames[1 + 5].updates, { LapCount: { L: 2 } });
});

test('spills a colliding discrete channel into the next free frame', () => {
  const frames = buildFrames(
    [
      {
        channel: 'TimingData',
        entries: [
          { tMs: 10, payload: { n: 1 } },
          { tMs: 50, payload: { n: 2 } },
          { tMs: 90, payload: { n: 3 } },
        ],
      },
    ],
    undefined
  );
  // All three land in bin 0, so they occupy three consecutive frames in order.
  assert.deepEqual(frames[1 + 0].updates, { TimingData: { n: 1 } });
  assert.deepEqual(frames[1 + 1].updates, { TimingData: { n: 2 } });
  assert.deepEqual(frames[1 + 2].updates, { TimingData: { n: 3 } });
});

test('overwrites telemetry channels within a frame instead of spilling', () => {
  const frames = buildFrames(
    [
      {
        channel: 'Position.z',
        entries: [
          { tMs: 10, payload: 'first' },
          { tMs: 50, payload: 'second' },
        ],
      },
    ],
    undefined
  );
  assert.equal(frames.length, 1 + 1);
  assert.deepEqual(frames[1].updates, { 'Position.z': 'second' });
});

test('does not merge two channels that share a frame', () => {
  const frames = buildFrames(
    [
      { channel: 'TimingData', entries: [{ tMs: 0, payload: { a: 1 } }] },
      { channel: 'TrackStatus', entries: [{ tMs: 0, payload: { b: 2 } }] },
    ],
    undefined
  );
  assert.deepEqual(frames[1].updates, {
    TimingData: { a: 1 },
    TrackStatus: { b: 2 },
  });
});

test('frame cadence matches the replay default', () => {
  assert.equal(FRAME_MS, 100);
});
