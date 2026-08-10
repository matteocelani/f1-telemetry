import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSeasonIndex, selectSessions, slugify } from './archive-index.ts';

const INDEX_JSON = JSON.stringify({
  Year: 2026,
  Meetings: [
    {
      Name: 'Pre-Season Testing',
      Number: 1,
      Location: 'Sakhir',
      Country: { Name: 'Bahrain' },
      Sessions: [
        { Name: 'Day 1', Type: 'Practice', StartDate: '2026-02-11T10:00:00', Path: 'p/' },
      ],
    },
    {
      Name: 'Chinese Grand Prix',
      Number: 2,
      Location: 'Shanghai',
      Country: { Name: 'China' },
      Sessions: [
        { Name: 'Sprint', Type: 'Race', StartDate: '2026-03-14T11:00:00', Path: 'cn-sprint/' },
        { Name: 'Race', Type: 'Race', StartDate: '2026-03-15T15:00:00', Path: 'cn-race/' },
      ],
    },
    {
      Name: 'Monaco Grand Prix',
      Number: 6,
      Location: 'Monte Carlo',
      Country: { Name: 'Monaco' },
      Sessions: [
        { Name: 'Race', Type: 'Race', StartDate: '2026-06-07T15:00:00', Path: 'mc-race/' },
      ],
    },
  ],
});

test('slugify strips the Grand Prix suffix', () => {
  assert.equal(slugify('Belgian Grand Prix'), 'belgian');
  assert.equal(slugify('Pre-Season Testing'), 'pre-season-testing');
});

test('excludes meetings without a Race session', () => {
  const sessions = parseSeasonIndex(INDEX_JSON);
  assert.equal(
    sessions.some((s) => s.meetingName === 'Pre-Season Testing'),
    false
  );
});

test('derives rounds chronologically, ignoring the unreliable Number field', () => {
  const sessions = parseSeasonIndex(INDEX_JSON);
  const china = sessions.find(
    (s) => s.meetingSlug === 'chinese' && s.sessionName === 'Race'
  );
  const monaco = sessions.find((s) => s.meetingSlug === 'monaco');
  assert.equal(china?.round, 1);
  assert.equal(monaco?.round, 2);
});

test('includes both Race and Sprint sessions', () => {
  const sessions = parseSeasonIndex(INDEX_JSON);
  const names = sessions
    .filter((s) => s.meetingSlug === 'chinese')
    .map((s) => s.sessionName);
  assert.deepEqual(names.sort(), ['Race', 'Sprint']);
});

test('selects the Grand Prix by name fragment, case-insensitively', () => {
  const sessions = parseSeasonIndex(INDEX_JSON);
  const picked = selectSessions(sessions, { name: 'MONACO' });
  assert.equal(picked.length, 1);
  assert.equal(picked[0].path, 'mc-race/');
});

test('matches on location as well as meeting name', () => {
  const sessions = parseSeasonIndex(INDEX_JSON);
  assert.equal(selectSessions(sessions, { name: 'shanghai' })[0].path, 'cn-race/');
});

test('selects the sprint when the sprint flag is set', () => {
  const sessions = parseSeasonIndex(INDEX_JSON);
  const picked = selectSessions(sessions, { name: 'chinese', sprint: true });
  assert.equal(picked[0].path, 'cn-sprint/');
});

test('selects by derived round number', () => {
  const sessions = parseSeasonIndex(INDEX_JSON);
  assert.equal(selectSessions(sessions, { round: 2 })[0].path, 'mc-race/');
});

test('all returns only Grands Prix unless sprints are requested', () => {
  const sessions = parseSeasonIndex(INDEX_JSON);
  assert.equal(selectSessions(sessions, { all: true }).length, 2);
  assert.equal(selectSessions(sessions, { all: true, sprints: true }).length, 3);
});

test('returns an empty list when nothing matches', () => {
  const sessions = parseSeasonIndex(INDEX_JSON);
  assert.deepEqual(selectSessions(sessions, { name: 'nowhere' }), []);
});
