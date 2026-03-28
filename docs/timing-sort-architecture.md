# Timing Tower Sort Architecture

**Regulation Reference:** FIA 2026 Formula 1 Sporting Regulations, Section B
**Affected Modules:** `apps/frontend/src/modules/timing/hooks/useTimingRows.ts`, `apps/frontend/src/store/timing.ts`

---

## 1. Architectural Philosophy

### Why We Cannot Blindly Trust the F1 WebSocket Stream

The F1 live-timing system broadcasts data over a SignalR endpoint via a **delta-compression protocol**. Each payload is a partial update — only changed fields are transmitted. The frontend reconstructs the full state by deep-merging incoming deltas onto a cached snapshot. This model introduces a set of structural properties that a naive implementation must not ignore:

**Temporal Latency at State Transitions.** The most critical moment in any timed session is the _transition_ between parts (Q1→Q2, Q2→Q3). At this boundary, the server simultaneously broadcasts `SessionPart`, `NoEntries`, and bulk `KnockedOut: true` flags for eliminated drivers. These are not guaranteed to arrive in a single WebSocket frame. The `Position` field on affected drivers may lag by one or more frames while the server reconciles its own classification state. Rendering server `Position` values during this window produces duplicates, gaps, and inverted orderings.

**Server `Position` is a Lagging Indicator in Qualifying.** In race sessions, on-road position changes occur continuously (overtakes, pit exits), and the timing system publishes a new `Position` with every meaningful delta. The server is the authoritative, low-latency arbiter of race order. In qualifying, `Position` is only updated at lap completion events — and during the multi-driver simultaneous KO transition, the server may emit the same `Position` value for multiple drivers before resolving the conflict. This was observed empirically with the 2025 Suzuka Q3 dataset (duplicate P4, P10 across multiple drivers; a skip from P4 to P8).

**`GapToLeader` and `IntervalToPositionAhead` are Null in Qualifying.** These fields are populated exclusively during Race and Sprint sessions. In qualifying, the per-part gap statistics are carried in a separate structure (`Stats`, keyed by part index) on `TimingDataF1`. A naïve implementation that reads `GapToLeader` in qualifying receives empty strings for all 22 drivers.

**`SessionPart` is an Unreliable Primary Source.** The `SessionPart` field is only emitted at part _transitions_, not on every frame. A client connecting mid-Q3 receives `SessionPart: 3` in the initial snapshot, but a client that reconnects moments before the Q2→Q3 flag may miss the transition frame entirely and remain stuck at `SessionPart: 2`. We therefore derive the effective session part from the _count of knocked-out drivers_ cross-referenced against `NoEntries`, which is always derivable from current state regardless of connection timing.

### The Fundamental Split: `isQualifying` vs `isQualifying = false`

Given the above properties, the system applies a strict binary dispatch at the sort boundary:

```typescript
const isQualifying =
  sessionInfo?.Type === 'Qualifying' ||
  sessionInfo?.Type === 'Sprint Qualifying';
```

| Session Type                    | `isQualifying` | Sort Authority                | Gap/Interval Source                       |
| ------------------------------- | -------------- | ----------------------------- | ----------------------------------------- |
| Qualifying (Q1/Q2/Q3)           | `true`         | Client-side 4-Group algorithm | `Stats[partIndex].TimeDiffToFastest`      |
| Sprint Qualifying (SQ1/SQ2/SQ3) | `true`         | Client-side 4-Group algorithm | `Stats[partIndex].TimeDiffToFastest`      |
| Free Practice (FP1/FP2/FP3)     | `false`        | Server `Position` field       | `GapToLeader` / `IntervalToPositionAhead` |
| Race                            | `false`        | Server `Position` field       | `GapToLeader` / `IntervalToPositionAhead` |
| Sprint Race                     | `false`        | Server `Position` field       | `GapToLeader` / `IntervalToPositionAhead` |

When `isQualifying = true`, the client **discards the server's `Position` entirely** and recomputes the full classification from first principles using the 4-Group algorithm. Server positions are replaced by a sequential re-index after sort completion.

When `isQualifying = false`, the server `Position` is the **primary and authoritative sort key**. The client adds a lightweight fallback chain for the pre-data skeletal state (before any timing data arrives) but does not override the server's classification judgment.

---

## 2. Qualifying & Sprint Shootout: The 4-Group Algorithm

### Regulation Reference: FIA Sporting Regulations Art. B2.4.3

Article B2.4.3 defines the qualifying classification order as follows (paraphrased):

> **(a)** Any driver who set a time in Q3 is classified P1–P10 in order of their best Q3 lap time.
> **(b)** Any driver eliminated in Q2 is classified P11–P16 in order of their best Q2 lap time.
> **(c)** Any driver eliminated in Q1 is classified P17–P22 in order of their best Q1 lap time.
> **(d)** Within each group, a driver who set no time is ranked below all drivers who did set a time.
> **(e)** Among drivers who set no time, classification is by the order in which they set their first timed lap (chronological tie-breaking).

### 2026 Grid Format

The 2026 F1 grid uses a standard 22-car format across three qualifying parts:

| Part | Starters | Eliminated | Advance       |
| ---- | -------- | ---------- | ------------- |
| Q1   | 22       | 6          | 16            |
| Q2   | 16       | 6          | 10            |
| Q3   | 10       | —          | (grid P1–P10) |

This yields `NoEntries = [22, 16, 10]`.

Sprint Qualifying uses a different format (`NoEntries = [20, 15, 10]`), eliminating 5 drivers per part. The algorithm is fully parametric on `NoEntries` and handles both formats without modification.

### Inferring the Effective Session Part

Because `SessionPart` from the stream is a lagging indicator (§1), we derive the current part from the knock-out count:

```typescript
function inferSessionPart(
  knockedOutCount: number,
  noEntries: number[]
): number {
  if (noEntries.length < 3) return 1;
  const q2Threshold = noEntries[0] - noEntries[1]; // 22 - 16 = 6
  const q3Threshold = noEntries[0] - noEntries[2]; // 22 - 10 = 12
  if (knockedOutCount >= q3Threshold) return 3;
  if (knockedOutCount >= q2Threshold) return 2;
  return 1;
}
```

This is monotonically stable: once a driver is marked `KnockedOut`, that flag is never reverted. The knock-out count can only increase, so `inferSessionPart` converges correctly even if the client connects mid-session.

### The `knockedOutParts` Store: Authoritative Elimination Tracking

The stream's `BestLapTimes` record (keyed `"0"`, `"1"`, `"2"` for Q1/Q2/Q3) is the classical signal for determining which part a driver was eliminated in: the highest index with a non-empty value identifies their last active part. However, this heuristic **fails for one edge case**: a driver eliminated in Q2 who set _no_ Q2 lap time. Their `BestLapTimes` record is identical to that of a Q1-eliminated driver, making them indistinguishable via `BestLapTimes` alone.

To resolve this, the Zustand timing store maintains a dedicated `knockedOutParts` dictionary that captures the elimination part at the exact moment of the `KnockedOut` state transition:

```typescript
// In timing.ts — updateLines reducer
if (delta.KnockedOut === true && !(driverNo in nextKnockedOutParts)) {
  // state.sessionPart is still the OUTGOING part because updateLines runs
  // before setSessionMeta in wsHandler.ts (see dispatch ordering comment).
  nextKnockedOutParts[driverNo] = state.sessionPart - 1; // convert to 0-indexed
}
```

The ordering guarantee is critical: in `wsHandler.ts`, `updateLines` is always called before `setSessionMeta` within the same `TIMING_F1` channel dispatch. When the Q1→Q2 transition payload arrives, `state.sessionPart` is still `1`. The eliminated drivers' `KnockedOut: true` flags are processed while `state.sessionPart = 1`, recording `partIndex = 0` (Q1). Only then does `setSessionMeta` advance `sessionPart` to `2`.

For **session snapshots and replays** (where KO transitions occurred before the client connected), `knockedOutParts` may be empty on initial load. The sort hook falls back to the `BestLapTimes` heuristic in this case:

```typescript
const koPartIndex =
  isQualifying && isKnockedOut
    ? driverNo in knockedOutParts
      ? knockedOutParts[driverNo] // authoritative: live transition
      : getKnockoutPartIndex(timing) // fallback: BestLapTimes heuristic
    : 0;
```

### The 4-Group Mathematical Model

All 22 drivers are assigned to one of four mutually exclusive sort groups. The group assignment is a pure function of the driver's `isKnockedOut` status, whether they hold a time for the _current_ part, and the part index in which they were eliminated.

| Group  | Condition                                                   | Sort Key           | FIA Reference  |
| ------ | ----------------------------------------------------------- | ------------------ | -------------- |
| **0**  | `!isKnockedOut` AND `bestLap ≠ ''`                          | Lap time ascending | B2.4.3 (a)     |
| **1**  | `!isKnockedOut` AND `bestLap = ''`                          | TLA alphabetical   | B2.4.3 (d)+(e) |
| **2**  | `isKnockedOut` AND `koPartIndex = effectiveSessionPart - 2` | Lap time ascending | B2.4.3 (b)     |
| **3+** | `isKnockedOut` AND `koPartIndex < effectiveSessionPart - 2` | Lap time ascending | B2.4.3 (c)     |

The group number for eliminated drivers is computed by the formula:

```
group(driver) = effectiveSessionPart - knockedOutParts[driverNo]
```

**Why this formula is correct:** Consider a Q3 session (`effectiveSessionPart = 3`).

- A driver eliminated in Q2 (`knockedOutParts = 1`): `group = 3 - 1 = 2` → ranked above Q1 eliminees ✓
- A driver eliminated in Q1 (`knockedOutParts = 0`): `group = 3 - 0 = 3` → ranked lowest ✓

For a Q2 session (`effectiveSessionPart = 2`):

- A driver eliminated in Q1 (`knockedOutParts = 0`): `group = 2 - 0 = 2` → single KO group ✓

The formula generalises to N parts without modification. Groups are naturally ordered: lower group number = better classification position.

**TypeScript implementation:**

```typescript
function getQualifyingGroup(
  row: UITimingRow,
  koPartIndices: Record<string, number>,
  effectiveSessionPart: number
): number {
  if (!row.isKnockedOut) return row.bestLap !== '' ? 0 : 1;
  const koPartIndex = koPartIndices[row.driverNo] ?? 0;
  return effectiveSessionPart - koPartIndex;
}
```

**Full sort comparator:**

```typescript
rows.sort((a, b) => {
  const groupA = getQualifyingGroup(a, koPartIndices, effectiveSessionPart);
  const groupB = getQualifyingGroup(b, koPartIndices, effectiveSessionPart);
  if (groupA !== groupB) return groupA - groupB;
  // Group 1 (active, no time): FIA B2.4.3(e) mandates chronological order.
  // The stream provides no absolute timestamps — TLA is the stable fallback.
  if (groupA === 1) return a.tla.localeCompare(b.tla);
  // All other groups: sort by the pre-resolved bestLap for that group's part.
  return (
    lapTimeToMs(a.bestLap) - lapTimeToMs(b.bestLap) ||
    a.tla.localeCompare(b.tla)
  );
});
```

After sorting, sequential positions are assigned to eliminate any server-side gaps or duplicates:

```typescript
const remapped = rows.map((row, idx) => ({ ...row, position: idx + 1 }));
```

### Resolving Best Lap Times per Group

Active drivers (Group 0) use the _current-part only_ best lap:

```typescript
// !isKnockedOut path
return timing?.BestLapTime?.Value ?? '';
```

`BestLapTime` is reset by the server at each part transition. Using it exclusively for active drivers prevents a Q2 lap time from contaminating Q3 rankings — a violation of FIA B2.4.3(a) which mandates classification exclusively on the current-part best time.

Eliminated drivers use the time from their elimination part via `BestLapTimes`:

```typescript
// isKnockedOut path
return timing?.BestLapTimes?.[String(koPartIndex)]?.Value ?? '';
```

### Known Stream Limitations

**⚠ Limitation 1 — Chronological Tie-Breaking (Group 1).**
FIA B2.4.3(e) states that among drivers who set no time, classification follows the chronological order in which they set their _first_ timed lap. The F1 live-timing stream does not broadcast absolute lap-start timestamps on the `TimingDataF1` channel. We therefore substitute TLA alphabetical ordering as a deterministic, stable tie-breaker. This satisfies the _stability_ requirement (two successive renders produce the same order) but does not faithfully implement B2.4.3(e) for the no-time group.

**⚠ Limitation 2 — Track Limits / Deleted Lap Times.**
When the stewards delete a lap time for track limits, the stream sets `BestLapTime.Value = ""` for the affected driver. The sort correctly moves them from Group 0 to Group 1 (no time). However, it is impossible to distinguish at the stream level between _"deleted due to track limits"_, _"never started a flying lap"_, and _"currently on an out-lap"_. All three states produce an identical `BestLapTime.Value = ""` signal. The FIA may apply different sub-classifications to these states (B2.4.3(d) sub-items A, B, C), which are not recoverable from the stream data alone.

**⚠ Limitation 3 — Q2-Eliminated Drivers With No Q2 Time (Snapshot/Replay Only).**
A driver eliminated at the end of Q2 who set no Q2 lap time produces a `BestLapTimes` record identical to a Q1-eliminated driver. The `knockedOutParts` store resolves this for live sessions by capturing the part at the moment of the `KnockedOut` transition. For replays or session snapshots loaded after the fact, the `getKnockoutPartIndex` fallback reads `BestLapTimes`, which misclassifies these drivers as Q1-eliminated. This is a stream data gap with no client-side resolution path.

---

## 3. Practice Sessions (FP1, FP2, FP3)

### Regulation Reference: FIA Sporting Regulations Art. B2.1

Article B2.1 defines practice session classification:

> _Drivers shall be classified in order of their best lap time set during the session. Drivers who have not set a lap time shall be listed after all classified drivers._

Practice classification is **monotonically stable**: once a driver sets a best lap, they hold a position. There are no elimination events, no part transitions, no inter-session lap time interactions. Every driver competes in a single continuous session against a single shared ranking.

### Why Server `Position` is Authoritative Here

Unlike qualifying, the conditions that make server `Position` unreliable are absent in practice:

1. **No simultaneous multi-driver state transitions.** Position updates are triggered one at a time, each by an individual driver's new best lap. There is no qualifying-style KO event that forces the server to re-rank 6 drivers simultaneously.
2. **Position updates are monotonic.** A driver's position can only improve (as they set faster laps) or remain stable. It never degrades during the session except when another driver sets a faster time, which is itself a separate update event.
3. **No cross-session lap time mixing.** Each practice session is independent. There is no concept of a "current part" best vs. "previous part" best.

The sort is therefore a direct delegation to the server:

```typescript
// isQualifying = false branch (also applies to Race and Sprint)
rows.sort((a, b) => {
  if (a.position !== NO_POSITION && b.position !== NO_POSITION)
    return a.position - b.position;
  if (a.position !== NO_POSITION) return -1;
  if (b.position !== NO_POSITION) return 1;
  // Pre-data skeleton: drivers with any timing data precede those with none
  const aHasData =
    a.lastLap !== '' ||
    a.bestLap !== '' ||
    a.sectors.some((s) => s.value !== '');
  const bHasData =
    b.lastLap !== '' ||
    b.bestLap !== '' ||
    b.sectors.some((s) => s.value !== '');
  if (aHasData !== bHasData) return aHasData ? -1 : 1;
  return a.tla.localeCompare(b.tla);
});
```

### Handling Drivers Without a Timed Lap

A driver who does not leave the pit lane during a practice session has `BestLapTime.Value = ""` and no server-assigned `Position` (the field arrives as `NaN` after `parseInt`). The sort correctly places them below all classified drivers via the `NO_POSITION` sentinel (`999`) and the `hasData` heuristic.

FIA B2.1 requires these drivers be listed after all classified drivers — our implementation satisfies this by design.

### Known Stream Limitations

**⚠ Limitation — No Client-Side Duplicate-Position Resolution.**
A transient duplicate `Position` value (two drivers at `"5"`) is possible during brief reconciliation windows following a new fastest lap. Unlike qualifying, we do not apply a client-side override because: (a) duplicate practice positions are rare and ephemeral, (b) we have no client-derivable sort key that accurately reflects FIA B2.1 ordering without trusting `BestLapTime.Value`, which the server already encodes in `Position`, and (c) adding a best-lap-time sort would require lap-time parsing overhead on every render cycle for minimal real-world gain. The collision is self-correcting within the next timing update.

---

## 4. Race and Sprint Race

### Regulation Reference: FIA Sporting Regulations Art. 14.1

Article 14.1 defines race classification:

> **(a)** Drivers are classified in order of the total distance covered during the race, in decreasing order.
> **(b)** When two or more drivers have covered the same number of laps, they are classified in the order in which they crossed the finish line on the last lap.
> **(c)** A driver who completes less than 90% of the race distance of the classified winner is annotated "Not Classified" (NC) and listed after all classified drivers, ordered by laps completed.
> **(d)** A disqualified driver (DSQ) is removed from the official classification.

### The Paradigm Shift: Lap Times Are Irrelevant

Race classification has no relationship to lap times. A driver who laps two seconds slower than their competitor but never pits and maintains track position will outrank the faster driver. The race sort key is purely **positional** (on-track order at any given moment), which the F1 timing system tracks with millisecond-level accuracy via transponder loops at every timing point on the circuit.

The server's `Position` field in race sessions reflects the FIA 14.1 classification at every instant: it encodes laps completed, crossing time on the last timed loop, and any reclassifications from penalties, DSQ, or NC status. No client-side derivation can match this fidelity. The correct implementation is full server delegation.

### Special State Handling

**DNF (Did Not Finish).** When a driver retires, the stream sets `Retired: true` on their `DriverTiming` record. The server pushes their `Position` to the bottom of the classified order, reflecting FIA 14.1(c) or (b) depending on laps completed. The `isRetired` flag is available on `UITimingRow` for visual treatment in the UI but is not used as a sort key — the server `Position` already encodes the correct classification.

**⚠ Transient Display Artifact — Retired Driver Position Window.** There exists a sub-second window between the arrival of `Retired: true` and the subsequent `Position` update pushing the driver to the back. During this window, the driver renders at their last racing position with `isRetired = true` styling. This is **mathematically acceptable** because:

1. The duration is bounded by the stream update frequency (~100ms at 10 Hz).
2. The final state (after `Position` update) is correct and FIA-compliant.
3. No persistent misclassification occurs — it is a transient cosmetic artifact, not an algorithmic error.

**DSQ (Disqualification).** The `DriverTiming` interface exposes no `Disqualified` boolean. The stream carries no first-class DSQ signal on the timing channel. When a DSQ is issued post-race, the server eventually removes the driver from the `Position` ranking or reassigns positions. The client renders whatever `Position` the server provides. This is a **stream data limitation** with no client-side resolution path.

**NC (Not Classified).** The server assigns an `NC` position value to drivers below the 90% threshold. These appear after all classified drivers in the server's `Position` ordering, which the sort correctly propagates.

### Gap and Interval Data

Race sessions use the standard gap fields from `TimingData`:

```typescript
const gap = isQualifying
  ? (qualiStats?.TimeDiffToFastest ?? '')
  : (timing?.GapToLeader ?? ''); // ← Race path

const interval = isQualifying
  ? (qualiStats?.TimeDifftoPositionAhead ?? '')
  : (timing?.IntervalToPositionAhead?.Value ?? ''); // ← Race path
```

These fields are populated continuously throughout the race at the timing line frequency. For the race leader, `GapToLeader = ""` by convention — this is the standard F1 display behaviour and is not treated as an error.

### Sprint Race

Sprint Race uses `sessionInfo.Type === 'Sprint'`, which falls into the `isQualifying = false` branch alongside `'Race'`. The classification rules (FIA Art. 14.1) apply identically. The `RACE_SESSION_TYPES` constant in `modules/timing/constants.ts` groups both:

```typescript
export const RACE_SESSION_TYPES = ['Race', 'Sprint'] as const;
```

---

## 5. Algorithm Compliance Matrix

| Feature                          | Session(s)     | FIA Article     | Implementation                                             | Status          |
| -------------------------------- | -------------- | --------------- | ---------------------------------------------------------- | --------------- |
| Best lap time ranking            | Qualifying, SQ | B2.4.3(a)(b)(c) | 4-Group sort with per-part `bestLap` resolution            | ✅ Compliant    |
| Elimination part grouping        | Qualifying, SQ | B2.4.3          | `effectiveSessionPart - knockedOutParts[driverNo]` formula | ✅ Compliant    |
| Cross-part time isolation        | Qualifying, SQ | B2.4.3(a)       | `BestLapTime` (current part) only for active drivers       | ✅ Compliant    |
| No-time driver ordering          | Qualifying, SQ | B2.4.3(d)       | Group 1 always after Group 0                               | ✅ Compliant    |
| No-time chronological tie-break  | Qualifying, SQ | B2.4.3(e)       | TLA alphabetical (stream limitation)                       | ⚠ Approximation |
| Track-limits deleted time        | Qualifying, SQ | B2.4.3          | Indistinguishable from no-time (stream limitation)         | ⚠ Stream Gap    |
| Q2-KO with no Q2 time (snapshot) | Qualifying, SQ | B2.4.3(b)       | Falls back to `BestLapTimes` heuristic                     | ⚠ Partial       |
| Best lap time ranking            | Practice       | B2.1            | Server `Position` delegation                               | ✅ Compliant    |
| DNS ordering in practice         | Practice       | B2.1            | `NO_POSITION` sentinel + `hasData` fallback                | ✅ Compliant    |
| On-road race position            | Race, Sprint   | 14.1(a)(b)      | Server `Position` delegation                               | ✅ Compliant    |
| DNF ordering by laps             | Race, Sprint   | 14.1(c)         | Server `Position` delegation                               | ✅ Compliant    |
| DSQ removal                      | Race, Sprint   | 14.1(d)         | Server `Position` delegation (stream limitation)           | ⚠ Stream Gap    |
| Retired transient window         | Race, Sprint   | 14.1            | Sub-100ms artifact, self-correcting                        | ✅ Acceptable   |

---

## 6. Glossary

| Term                       | Definition                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Delta protocol**         | The F1 SignalR encoding where only changed fields are transmitted per frame; the client deep-merges each delta onto a cached snapshot.                                           |
| **`KnockedOut`**           | Boolean flag set to `true` on `DriverTiming` at the moment a driver is eliminated from qualifying. Never reverted.                                                               |
| **`knockedOutParts`**      | Zustand store dictionary mapping driver racing number to the 0-indexed qualifying part in which they were eliminated (Q1=0, Q2=1, Q3=2).                                         |
| **`effectiveSessionPart`** | The client-derived current qualifying part, computed from knock-out count via `inferSessionPart`. Preferred over the stream's `SessionPart` field.                               |
| **`BestLapTime`**          | The server-maintained best lap for the _current qualifying part only_. Reset at each part transition.                                                                            |
| **`BestLapTimes`**         | A keyed record (`"0"`, `"1"`, `"2"`) holding the best lap for each qualifying part across the full session. Never reset.                                                         |
| **`Stats`**                | Per-part gap and interval data. Can arrive as a keyed object or array depending on the delta frame type (a known F1 protocol quirk).                                             |
| **`NO_POSITION`**          | Sentinel value `999` used when `timing.Position` is absent or `NaN`, ensuring un-positioned drivers sort after all positioned drivers.                                           |
| **Algorithmic Feature**    | A deliberate client-side computation that improves on or replaces stream data (e.g., the 4-Group sort, `inferSessionPart`).                                                      |
| **Stream Limitation**      | A constraint imposed by missing or ambiguous data in the F1 live-timing protocol that cannot be resolved client-side without ground-truth information unavailable in the stream. |
