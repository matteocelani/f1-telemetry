# F1 Telemetry

An open-source real-time dashboard for Formula 1 live timing and telemetry data.

## Overview

F1 Telemetry connects directly to the F1 Live Timing SignalR feed — the same stream that powers the official timing screens during race weekends — decodes the payload in real time, and serves it over WebSocket to a browser-based analytics dashboard.

The goal is to give anyone a clean, fast, and accurate view into what is happening on track: car telemetry, lap and sector times, race control messages, weather, and more.

## Features

- Live car telemetry: speed, RPM, gear, throttle, brake, and active aerodynamics per driver
- Live timing: lap times, sector splits, gaps, and tyre compounds
- Track map: high-frequency GPS coordinates for every car on circuit
- Race control: instant updates for flags, safety car deployments, and official messages
- Weather: air and track temperature, wind, humidity, and rainfall in real time

## Architecture

This is a [pnpm](https://pnpm.io) monorepo with three packages:

| Package    | Path            | Description                                                                                 |
| ---------- | --------------- | ------------------------------------------------------------------------------------------- |
| `backend`  | `apps/backend`  | Node.js service that connects to F1 SignalR, decodes payloads, and broadcasts via WebSocket |
| `frontend` | `apps/frontend` | Next.js analytics dashboard                                                                 |
| `core`     | `core`          | Shared TypeScript types and constants                                                       |

### Data flow

```
F1 SignalR (livetiming.formula1.com)
    └── backend (Node.js + ws)
          ├── /health  HTTP endpoint for frontend status polling
          └── ws://    WebSocket broadcast to frontend clients
```

The backend subscribes to all ten available F1 channels. Compressed channels (`CarData.z`, `Position.z`) are decoded with raw DEFLATE. All channels are batched in 50ms windows before broadcast to reduce WebSocket frame volume.

## Getting started

```bash
# Install dependencies
pnpm install

# Configure environment (defaults work out of the box)
cp .env.example apps/backend/.env

# Start backend and frontend in parallel
pnpm dev
```

Backend runs on `ws://localhost:8080` (WebSocket) and `http://localhost:8081/health` (HTTP health check).
Frontend runs on `http://localhost:3000`.

### Replay mode (no live session needed)

```bash
pnpm dev:replay
```

This replays a pre-recorded session through the WebSocket server so you can work on the frontend outside of race weekends. See [docs/replay-mode.md](docs/replay-mode.md) for details on adding your own recordings.

## Documentation

- [Replay mode](docs/replay-mode.md) — how to develop and test the live dashboard without an active F1 session
- [F1 Live Timing payload types](docs/live-timing-types.md) — field reference for all ten subscribed channels, 2026 regulation notes, and maintenance guide

## Contributing

The live timing schema is reverse-engineered and may change between seasons. See [docs/live-timing-types.md](docs/live-timing-types.md) for guidance on keeping the types up to date.

Issues and pull requests are welcome.

## License

MIT
