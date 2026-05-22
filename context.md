# CS2 POV Notifier — Project Context

## What this project does

A system that monitors YouTube channels publishing CS2 POV footage, and notifies users when a new video is posted featuring a player that plays their role. In CS2, each player has a specific positional role for each map and side (T/CT), so users want to watch players who play the same position as them — not just any pro player.

## The problem it solves

POV content is spread across multiple YouTube channels. To find a video relevant to your role, you'd have to manually check each channel and figure out what position each player plays. This system automates that: scrape the role data, monitor the channels, match videos to roles, notify users.

## Architecture (phased)

### Phase 1 — Foundations (current)
- **Scraper**: pulls player + role data from Skybox (edge.skybox.gg/u/leaderboards) into the DB
- **YouTube poller**: monitors configured channels for new video uploads
- **Video parser**: extracts player name (and ideally map) from video titles
- **Database**: PostgreSQL — source of truth for all data

### Phase 2 — API + users
- FastAPI endpoints for user registration and subscription management
- Role matching engine: when a new video is parsed, fan out to all users whose subscriptions match

### Phase 3 — Scale
- Replace APScheduler with Celery + Redis for distributed task queuing

## Tech stack

| Layer | Tool | Why |
|---|---|---|
| Scraping | Playwright | Skybox is a JS SPA — plain HTTP gets nothing. Playwright runs real Chromium. |
| HTTP (if API found) | httpx | If Skybox exposes a clean JSON API via DevTools, replace Playwright with httpx |
| ORM | SQLAlchemy 2 | Native async support, pairs with Alembic for migrations |
| Migrations | Alembic | Schema will evolve — never drop tables to apply changes |
| Scheduling | APScheduler | Runs scraper (daily) and YouTube poller (hourly) inside the Python process |
| API | FastAPI | Async, auto-generates OpenAPI docs |
| Database | PostgreSQL | Relational structure fits map × side × role dimensions naturally |
| Local DB | Docker Compose | One command to spin up Postgres locally |

## Project structure

```
cs2-pov-notifier/
├── scraper/
│   ├── skybox.py         # Playwright logic
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

## Domain model

### Roles — two levels
1. **Map roles**: specific positional roles per map per side, scraped from Skybox. e.g. Mirage CT → "A Anchor", "A Connector", "B Anchor", "B Short", "CT Allround". Each map has ~5 roles per side, ~70 rows total across all maps.
2. **General roles**: archetype-level labels that cut across maps — "IGL", "AWPer", "Entry", "Support", "Lurker". ~6–8 rows, seeded manually. A player can have more than one (e.g. a player can be both IGL and AWPer).

### Maps
7 active CS2 maps. Stored as a lookup table — never hardcode map names as strings.

### Players
Scraped from Skybox. Each player has one map role per map per side (14 roles total across 7 maps). Players also have an `aliases` array for name variations used in video titles (e.g. "NiKo" vs "niko").

## Database schema

### Seed order (respect FK dependencies)
1. `maps`
2. `map_roles`
3. `general_roles`
4. `players`
5. `player_roles`
6. `player_general_roles`

### CREATE statements

```sql
-- 1. maps
CREATE TABLE maps (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. map_roles (depends on maps)
CREATE TYPE side_enum AS ENUM ('T', 'CT');

CREATE TABLE map_roles (
    id     SERIAL PRIMARY KEY,
    map_id INTEGER      NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    side   side_enum    NOT NULL,
    name   VARCHAR(100) NOT NULL,
    UNIQUE (map_id, side, name)
);

-- 3. general_roles
CREATE TABLE general_roles (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 4. players
CREATE TABLE players (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    team       VARCHAR(100),
    aliases    TEXT[]       DEFAULT '{}',
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 5. player_roles (depends on players + map_roles)
CREATE TABLE player_roles (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER   NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    map_role_id     INTEGER   NOT NULL REFERENCES map_roles(id) ON DELETE CASCADE,
    last_scraped_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, map_role_id)
);

-- 6. player_general_roles (depends on players + general_roles)
CREATE TABLE player_general_roles (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    general_role_id INTEGER NOT NULL REFERENCES general_roles(id) ON DELETE CASCADE,
    UNIQUE (player_id, general_role_id)
);
```

### Schema decisions (important — do not undo these)

**`player_roles` has no `map_id` column.** An earlier version had it, but it's redundant — the map is already encoded in `map_roles.map_id`. Always join through `map_role_id → map_roles` to get the map.

**`player_roles` has no `side` column.** Same reason — side is already in `map_roles.side`. Get it via join, not directly.

**`map_roles` unique constraint is `(map_id, side, name)`.** A role name like "A Anchor" can exist on multiple maps (e.g. Mirage CT and Inferno CT), so the constraint must include all three columns.

**`ON DELETE CASCADE` on all FKs.** Deleting a map cascades to its map_roles, which cascades to any player_roles pointing at them. Keeps the DB clean without manual orphan management.

**`updated_at` on `players` does not auto-update.** Postgres has no built-in auto-update for this. Handle it explicitly in SQLAlchemy (via an event listener or by setting it on every update), or add a Postgres trigger later.

**`aliases` is a Postgres text array.** Used by the video parser to match player names in YouTube titles. When a new alias is discovered, append it here rather than normalizing into a separate table — the lookup is simple enough that an array suffices.

## Scraping notes

**Skybox is a JS SPA.** A plain HTTP request to edge.skybox.gg/u/leaderboards returns an empty shell. Two approaches:
1. **Preferred**: open the page in Chrome DevTools → Network → XHR/Fetch, find the underlying API call (likely something like `api.skybox.gg/...`). If unauthenticated, call it directly with `httpx` — no browser needed.
2. **Fallback**: use Playwright to load the page, wait for data to render, extract from DOM.

**Scraper is diff-aware.** On each run, upsert into `player_roles` rather than wiping and reloading. Only write when data has actually changed. This preserves `last_scraped_at` accuracy and avoids unnecessary DB churn.

## YouTube polling notes

- Use YouTube Data API v3 `playlistItems.list` (cheaper on quota than `search.list`) per channel
- Poll hourly
- Store every seen `youtube_video_id` in the `videos` table to avoid reprocessing
- Video parser matches player names from `players.name` + `players.aliases` against the video title using fuzzy matching

## What is not built yet (phase 2+)

- `channels` table (YouTube channels to monitor)
- `videos` table (scraped video metadata)
- `users` table
- `user_map_subscriptions` table (notify me when someone playing A Anchor on Mirage CT posts)
- `user_general_subscriptions` table (notify me whenever any AWPer posts)
- FastAPI endpoints
- Notification delivery (email / push / webhook — TBD)
