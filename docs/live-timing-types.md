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

**After 2026 Bahrain (March 15-17):**
Capture raw `CarData.z` frames from the live backend and confirm the numeric values for channel 45 (active aerodynamics). Replace `ActiveAeroStatus = number` with a precise union type and remove the 2026 note from the JSDoc.

**References:**

- FastF1: https://github.com/theOehrly/Fast-F1
- OpenF1: https://github.com/br-g/openf1

---

## Subscribed channels

The backend subscribes to all ten available channels.

| Channel               | Format      | Content                            | Update rate   |
| --------------------- | ----------- | ---------------------------------- | ------------- |
| `CarData.z`           | raw DEFLATE | Per-car telemetry                  | ~3.7 Hz       |
| `Position.z`          | raw DEFLATE | GPS coordinates per car            | ~3.7 Hz       |
| `TimingData`          | JSON        | Lap times, sector times, gaps      | Event-driven  |
| `TimingAppData`       | JSON        | Tyre compounds, stint history      | Event-driven  |
| `TimingStats`         | JSON        | Personal bests, speed trap records | Event-driven  |
| `DriverList`          | JSON        | Driver and team metadata           | Once at start |
| `WeatherData`         | JSON        | Track and air conditions           | ~1 Hz         |
| `RaceControlMessages` | JSON        | Flags, safety car, pit lane status | Event-driven  |
| `TrackStatus`         | JSON        | Global flag status code            | Event-driven  |
| `SessionInfo`         | JSON        | Meeting and session metadata       | Once at start |

Channels ending in `.z` are compressed with raw DEFLATE (no zlib header) and decoded in `payload-parser.ts`.

---

## 2026 regulation changes

**DRS abolished.** Channel 45, previously carrying DRS state, now carries the active aerodynamics mode (X-mode on straights, Z-mode in corners). The numeric values for the new system are not yet confirmed. The type is kept as `ActiveAeroStatus = number` until live data is captured.

Pre-2026 channel 45 values for reference: `0` closed, `8` detection zone, `10` open, `14` closing.

**Overtake Mode.** A new push-to-pass system (electric power boost within 1s of the car ahead) may appear as a new channel or extend an existing one. Not yet observed in the feed.

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

### TimingData

Only changed fields are sent per message. The consumer must merge each update into the existing state.

Speed point keys: `FL` = Finish Line, `ST` = Speed Trap, `I1` / `I2` = Intermediate sectors.

---

### TimingAppData

Tyre compound values: `SOFT`, `MEDIUM`, `HARD`, `INTERMEDIATE`, `WET`, `UNKNOWN`.

`UNKNOWN` is used at session start before the compound is confirmed.

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
