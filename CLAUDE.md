# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**CS2 POV Notifier** — monitors YouTube channels for CS2 POV footage and notifies users when a video is posted featuring a player who plays their positional role on a given map/side. Full context in `context.md`.

## Tech stack

| Layer | Tool |
|---|---|
| Language | Python |
| Scraping | Playwright (Skybox SPA) / httpx (if API found) |
| ORM | SQLAlchemy 2 (async) |
| Migrations | Alembic — never drop tables to apply changes |
| Scheduling | APScheduler (scraper daily, YouTube poller hourly) |
| API | FastAPI (phase 2) |
| Database | PostgreSQL |
| Local DB | Docker Compose |

## Project structure

```
cs2-pov-notifier/
├── scraper/
│   ├── skybox.py         # Playwright/httpx logic
│   └── youtube.py        # YouTube poller
├── db/
│   ├── models.py         # SQLAlchemy models
│   └── migrations/       # Alembic migrations
├── matching/
│   └── engine.py         # Role ↔ video matching
├── api/                  # FastAPI (phase 2)
├── scheduler.py          # APScheduler entry point
├── docker-compose.yml
└── pyproject.toml
```

## Database

### Seed order (FK dependency order)
`maps` → `map_roles` → `general_roles` → `players` → `player_roles` → `player_general_roles`

### Schema decisions — do not undo

- **`player_roles` has no `map_id` or `side` columns.** Both are already encoded in `map_roles`. Always join through `map_role_id → map_roles` to get map or side.
- **`map_roles` unique constraint is `(map_id, side, name)`**, not just `name` — the same role name (e.g. "A Anchor") appears on multiple maps.
- **`ON DELETE CASCADE` on all FKs.** Deleting a map cascades through `map_roles` → `player_roles` automatically.
- **`updated_at` on `players` does not auto-update.** Set it explicitly in SQLAlchemy on every update (event listener or manual assignment).
- **`aliases` is a Postgres `TEXT[]` array** on `players`. Append new name variants here; do not normalize into a separate table.

### Map names
7 active CS2 maps live in the `maps` table. Never hardcode map names as strings elsewhere.

## Scraping

**Skybox** (`edge.skybox.gg/u/leaderboards`) is a JS SPA. Preferred approach: inspect Network tab in DevTools for an underlying JSON API and call it with `httpx`. Fallback: Playwright DOM extraction.

Scraper must be **diff-aware**: upsert `player_roles` on each run rather than wipe-and-reload, so `last_scraped_at` only updates when data actually changes.

## YouTube polling

- Use `playlistItems.list` (YouTube Data API v3) — cheaper on quota than `search.list`
- Track every processed `youtube_video_id` in the `videos` table to avoid reprocessing
- Match player names against video titles using `players.name` + `players.aliases` with fuzzy matching
