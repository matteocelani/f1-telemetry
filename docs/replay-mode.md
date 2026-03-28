# Replay Mode (Dev Mode)

During a live F1 session, the backend connects to the official SignalR feed and relays data to the frontend via WebSocket. Outside of race weekends there is no live data available, which makes frontend development impossible.

**Replay mode** solves this by feeding pre-recorded session data through the same WebSocket server. The frontend connects normally and cannot tell the difference — every store, component, and animation behaves exactly as it would during a real session.

## Quick start

```bash
pnpm dev:replay
```

This starts the replay backend on `ws://localhost:8080` and the Next.js frontend on `http://localhost:3000`. Open the browser and navigate to `/live` — the dashboard will populate with real timing data from the recording.

## How it works

The replay server (`apps/backend/src/replay.ts`) does three things:

1. Reads a JSON recording file into memory
2. Starts the same `SocketServer` and `HealthServer` used in production
3. Iterates through the frames at a fixed interval, broadcasting each one to connected clients

When it reaches the end of the file, it loops back to the beginning. The server runs until you stop it.

## Included recordings

| File | Session | Size | Frames |
| ---- | ------- | ---- | ------ |
| `apps/backend/data/china.json` | 2025 Chinese Grand Prix | ~500 KB | 1146 |

## Recording format

A recording file is a JSON array of frame objects. Each frame has a single `updates` key containing one or more channel payloads — the exact format the backend normally broadcasts over WebSocket:

```json
[
  {
    "updates": {
      "TimingData": {
        "Lines": {
          "44": {
            "LastLapTime": { "Value": "1:32.456" }
          }
        }
      }
    }
  },
  {
    "updates": {
      "WeatherData": {
        "AirTemp": "28.3",
        "TrackTemp": "42.1",
        "Humidity": "55"
      },
      "TimingData": {
        "Lines": {
          "1": {
            "Position": "1",
            "GapToLeader": ""
          }
        }
      }
    }
  }
]
```

A single frame can contain updates for multiple channels simultaneously. The available channels are defined in `core/src/constants.ts` and documented in [live-timing-types.md](live-timing-types.md).

## Adding your own recordings

To record a session, connect to the backend WebSocket during a live event and capture the frames. Place the resulting JSON file in `apps/backend/data/` and run:

```bash
pnpm --filter backend dev:replay -- apps/backend/data/your-file.json
```

If no file path is provided, the server defaults to `apps/backend/data/china.json`.

## Configuration

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `REPLAY_INTERVAL` | `100` | Milliseconds between each frame (lower = faster playback) |
| `PORT` | `8080` | WebSocket server port |
| `HEALTH_PORT` | `8081` | Health check HTTP port |

Examples:

```bash
# Faster playback (50ms per frame)
REPLAY_INTERVAL=50 pnpm --filter backend dev:replay

# Custom port
PORT=9090 pnpm --filter backend dev:replay
```

## Contributing recordings

If you captured a session and want to share it, open a PR adding the JSON file to `apps/backend/data/`. Keep the file name descriptive (e.g., `monaco-2025-qualifying.json`). Recordings under 5 MB are fine to commit directly.
