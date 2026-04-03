# F1 Live Timing Types

Type definitions for the F1 Live Timing SignalR feed, used by both the backend (forwarding) and the frontend (rendering).

Full definitions: [`core/src/live-timing.ts`](../core/src/live-timing.ts)

---

## How to maintain these types

The F1 Live Timing feed has no public schema. Types are reverse-engineered by the community and may change between seasons without notice.

**When to update:**

- At the start of each season, review the FastF1 and OpenF1 changelogs before race 1.
- After any session where unexpected data appears in the WebSocket stream, inspect the raw payload and update the affected interface.
- Always update `live-timing.ts` and this document in the same commit.

**References:**

- FastF1: https://github.com/theOehrly/Fast-F1
- OpenF1: https://github.com/br-g/openf1

---

## Subscribed channels

The backend subscribes to all available channels. Not all channels broadcast data during every session — the F1 server decides which channels are active based on session type and conditions.

### Core channels (always available)

| Channel               | Format      | Content                            | Update rate   |
| --------------------- | ----------- | ---------------------------------- | ------------- |
| `CarData.z`           | raw DEFLATE | Per-car telemetry                  | ~3.7 Hz       |
| `Position.z`          | raw DEFLATE | GPS coordinates per car            | ~3.7 Hz       |
| `TimingData`          | JSON        | Lap times, sector times, gaps      | Event-driven  |
| `TimingDataF1`        | JSON        | Extended timing with micro-sectors | Event-driven  |
| `TimingAppData`       | JSON        | Tyre compounds, stint history      | Event-driven  |
| `TimingStats`         | JSON        | Personal bests, speed trap records | Event-driven  |
| `DriverList`          | JSON        | Driver and team metadata           | Once at start |
| `WeatherData`         | JSON        | Track and air conditions           | ~1 Hz         |
| `RaceControlMessages` | JSON        | Flags, safety car, pit lane status | Event-driven  |
| `TrackStatus`         | JSON        | Global flag status code            | Event-driven  |
| `SessionInfo`         | JSON        | Meeting and session metadata       | Once at start |
| `ExtrapolatedClock`   | JSON        | Session countdown timer            | ~1 Hz         |
| `LapCount`            | JSON        | Current lap and total laps         | Per lap       |
| `SessionData`         | JSON        | Session lifecycle events           | Event-driven  |
| `Heartbeat`           | JSON        | Keep-alive signal                  | ~1 Hz         |

### Extended channels (availability varies)

| Channel               | Content                              |
| --------------------- | ------------------------------------ |
| `TeamRadio`           | Team radio message notifications     |
| `PitLaneTimeCollection` | Pit lane transit times             |
| `PitStopSeries`       | Pit stop durations per driver        |
| `LapSeries`           | Lap-by-lap positions per driver      |
| `TopThree`            | Podium positions with diff data      |
| `CurrentTyres`        | Current tyre compound per driver     |
| `TyreStintSeries`     | Stint history with compounds         |
| `ChampionshipPrediction` | Live championship point projections |
| `DriverRaceInfo`      | Race-specific driver information     |
| `OvertakeSeries`      | Overtake events                      |
| `TlaRcm`              | Weather/track condition messages     |

> **Note:** `CarData.z` and `Position.z` are not guaranteed to be available in every session. Some sessions (notably in 2026) have been observed to not broadcast GPS position data at all. The frontend handles this gracefully by falling back to micro-sector-based positioning.

Channels ending in `.z` are compressed with raw DEFLATE (no zlib header) and decoded in `payload-parser.ts`.

---

## 2026 regulation changes

**DRS abolished.** Channel 45, previously carrying DRS state, now carries the active aerodynamics mode (X-mode on straights, Z-mode in corners). The exact numeric values for the new system have not been confirmed from live data capture. The type is kept as `ActiveAeroStatus = number` until confirmed values are observed.

Pre-2026 channel 45 values for reference: `0` closed, `8` detection zone, `10` open, `14` closing.

**Overtake Mode.** A new push-to-pass system (electric power boost within 1s of the car ahead) may appear as a new channel or extend an existing one. Not yet observed as a distinct channel in the feed.

---

## Channel reference

### CarData.z

Raw structure after decompression:

```json
{
  "Entries": [
    {
      "Cars": {
        "1": {
          "Channels": {
            "0": 11500,
            "2": 287,
            "3": 7,
            "4": 95,
            "5": 0,
            "45": 10
          }
        }
      }
    }
  ]
}
```

Channel index mapping:

| Index | Field        | Notes                                      |
| ----- | ------------ | ------------------------------------------ |
| `0`   | `rpm`        | Engine RPM                                 |
| `2`   | `speed`      | Speed in km/h                              |
| `3`   | `gear`       | 0 = neutral, 1–8                           |
| `4`   | `throttle`   | 0–100%                                     |
| `5`   | `brake`      | 0 = off, 100 = full                        |
| `45`  | `activeAero` | 2026: active aero state — exact values TBD |

---

### Position.z

```json
{
  "Position": [
    { "Timestamp": "...", "Entries": { "1": { "X": 1234, "Y": 5678, "Z": 0 } } }
  ]
}
```

`X` and `Y` are circuit coordinates. `Z` is altitude, typically broadcast as `0`.

---

### TimingData / TimingDataF1

Only changed fields are sent per message. The consumer must merge each update into the existing state (delta protocol).

`TimingDataF1` extends `TimingData` with micro-sector segment statuses. Segment status values:

| Status | Meaning                  |
| ------ | ------------------------ |
| `0`    | Cleared/reset (lap boundary) |
| `2048` | Completed (normal)       |
| `2049` | Completed (overall best) |
| `2051` | Completed (sector boundary + personal best) |
| `2064` | Not yet reached / yellow flag |

Speed point keys: `FL` = Finish Line, `ST` = Speed Trap, `I1` / `I2` = Intermediate sectors.

---

### TimingAppData

Tyre compound values: `SOFT`, `MEDIUM`, `HARD`, `INTERMEDIATE`, `WET`, `UNKNOWN`.

`UNKNOWN` is used at session start before the compound is confirmed.

Stint data includes `TotalLaps` (laps on current set) and `StartLaps` (always `0` — F1 does not send the absolute start lap; consumers must compute it cumulatively from `TotalLaps` across stints).

---

### TimingStats

Personal bests per driver for lap time, individual sectors, and speed traps. Keyed by sector index (`"0"`, `"1"`, `"2"`) and speed point (`FL`, `ST`, `I1`, `I2`).

---

### DriverList

Sent once at session start. `TeamColour` is a hex RGB string without the leading `#`. `CountryCode` follows ISO 3166-1 alpha-3.

---

### WeatherData

All values are broadcast as strings. Parse to float before arithmetic. `Rainfall` is `"0"` (dry) or `"1"` (rain). `WindDirection` is degrees 0–360.

---

### RaceControlMessages

`Category` values: `Flag`, `SafetyCar`, `Drs`, `Other`.

`Flag` values: `GREEN`, `YELLOW`, `DOUBLE YELLOW`, `RED`, `CHEQUERED`, `BLACK AND WHITE`, `CLEAR`.

---

### TrackStatus

| Code | Constant       | Meaning            |
| ---- | -------------- | ------------------ |
| `1`  | `ALL_CLEAR`    | Green flag         |
| `2`  | `YELLOW`       | Yellow flag        |
| `4`  | `SC_DEPLOYED`  | Safety Car         |
| `5`  | `RED`          | Red flag           |
| `6`  | `VSC_DEPLOYED` | Virtual Safety Car |
| `7`  | `VSC_ENDING`   | VSC ending         |

---

### SessionInfo

`Type` values: `Practice`, `Qualifying`, `Race`, `Sprint`, `Sprint Qualifying`.

---

### LapCount

```json
{ "CurrentLap": 15, "TotalLaps": 53 }
```

`CurrentLap` is the lap currently being driven (not completed). Increments at the start/finish line. `TotalLaps` is the scheduled race distance.
