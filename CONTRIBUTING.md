# Contributing

## Getting started

```bash
git clone https://github.com/matteocelani/f1-telemetry.git
cd f1-telemetry
pnpm install
pnpm dev:replay
```

Open `http://localhost:3000/live` to see the dashboard with recorded session data.

## Before opening a PR

It's generally a good idea to open an issue first to discuss the change — especially for new features or architectural decisions. This helps avoid duplicated effort and ensures alignment before you write code.

## Code standards

All coding rules, architecture guidelines, commit format, and PR format are defined in [CLAUDE.md](CLAUDE.md). Read it before making changes.

## Live timing types

The F1 feed has no public schema — types are reverse-engineered and may change between seasons. See [docs/live-timing-types.md](docs/live-timing-types.md) for the maintenance guide.
