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

## Data quality in replay mode

Replay recordings capture the raw F1 feed as-is. Depending on when the recording started (mid-session vs. from the beginning), some data may be incomplete:

- **Micro-sector segments** may be missing for some drivers, causing track map dots to update less frequently
- **`InPit` flags** may get stuck if the recording missed the corresponding `false` transition
- **`NumberOfLaps`** may skip values if the F1 feed dropped those updates
- **`Position` values** may temporarily show duplicates during asynchronous overtake updates

During a **live session**, the data feed is significantly more complete and the dashboard behaves more accurately. These artifacts are a property of the sparse F1 delta protocol, not bugs in the application.

## Recording sessions

Use the built-in recorder to capture live sessions:

```bash
pnpm --filter backend record data/your-session.json
```

The recorder connects to the F1 SignalR feed, subscribes to all available channels, and saves every frame with its server timestamp. Press `Ctrl+C` to stop and save — the recording is written atomically on shutdown.

> **Important:** Always stop the recorder with `Ctrl+C` (SIGINT). Killing the process without SIGINT will lose all data, as frames are held in memory until the graceful shutdown handler writes them to disk.

Place recording files in `apps/backend/data/`. To replay a specific file:

```bash
pnpm --filter backend dev:replay -- data/your-session.json
```

If no file path is provided, the server uses the default recording configured in `replay.ts`.

## Recording format

A recording file is a JSON array of frame objects. Each frame has a `timestamp` (ISO 8601 from the F1 server) and an `updates` object containing one or more channel payloads:

```json
[
  {
    "timestamp": "2026-03-29T05:14:10.233Z",
    "updates": {
      "TimingDataF1": {
        "Lines": {
          "12": {
            "Sectors": { "0": { "Segments": { "1": { "Status": 2049 } } } }
          }
        }
      }
    }
  },
  {
    "timestamp": "2026-03-29T05:14:12.456Z",
    "updates": {
      "WeatherData": {
        "AirTemp": "28.3",
        "TrackTemp": "42.1",
        "Humidity": "55"
      }
    }
  }
]
```

A single frame can contain updates for multiple channels simultaneously. The available channels are defined in `core/src/constants.ts` and documented in [live-timing-types.md](live-timing-types.md).

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

If you captured a session and want to share it, open a PR adding the JSON file to `apps/backend/data/`. Keep the file name descriptive (e.g., `monaco-2026-qualifying.json`). Recordings under 5 MB are fine to commit directly.
