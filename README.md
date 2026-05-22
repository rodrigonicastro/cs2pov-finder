# CS2 POV Finder

Monitors YouTube channels for CS2 POV footage and surfaces videos based on the players, maps, and roles you care about.

## Features

- **Personalised feed** — subscribe to players and map roles; your feed shows only relevant POVs
- **Role-based filtering** — filter by T/CT role, map, and match type (FACEIT or pro matches)
- **Automatic ingestion** — YouTube poller runs hourly; Skybox role data refreshes weekly
- **OTP authentication** — passwordless sign-in and registration via email code
- **Player & role management** — add/remove followed players and map roles at any time

## Tech stack

| Layer | Tool |
|---|---|
| Backend API | FastAPI + SQLAlchemy 2 (async) |
| Database | PostgreSQL |
| Migrations | Alembic |
| Scraping | Skybox GraphQL API (httpx) |
| YouTube | YouTube Data API v3 |
| Scheduler | APScheduler |
| Frontend | React + TypeScript (Vite) |
| Local DB | Docker Compose |

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (for local PostgreSQL)
- A [YouTube Data API v3](https://console.cloud.google.com/) key
- A [Skybox](https://skybox.gg) API token
- A Gmail account with an [app password](https://myaccount.google.com/apppasswords) for sending OTPs

## Local setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd cs2-pov-finder
cp .env.example .env
# Fill in all values in .env
```

### 2. Start the database

```bash
docker-compose up -d
```

### 3. Set up the Python environment

```bash
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
```

### 4. Run migrations and seed maps

```bash
alembic upgrade head
python -m db.seed
```

### 5. Start the API

```bash
uvicorn api.main:app --reload
```

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### 7. Run the scheduler (optional)

In a separate terminal:

```bash
python -m scraper.scheduler
```

This starts the YouTube poller (runs immediately, then every hour) and the Skybox scraper (weekly on Mondays at 03:00 UTC).

## Environment variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `YOUTUBE_CHANNEL_IDS` | Comma-separated channel IDs to monitor |
| `SKYBOX_API_TOKEN` | Skybox bearer token |
| `SMTP_*` | SMTP credentials for sending OTP emails |
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) |
| `VITE_API_BASE` | Backend URL for the frontend (in `frontend/.env`) |

## Project structure

```
├── api/                  # FastAPI routers (auth, videos, roles, players, maps)
├── db/
│   ├── models.py         # SQLAlchemy models
│   ├── database.py       # Async engine + session
│   ├── seed.py           # Map seeding script
│   └── migrations/       # Alembic migrations
├── scraper/
│   ├── skybox.py         # Skybox role scraper
│   ├── youtube.py        # YouTube channel poller
│   └── scheduler.py      # APScheduler entry point
├── frontend/             # React + TypeScript app
├── docker-compose.yml    # Local PostgreSQL
└── .env.example
```
