#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting scheduler..."
exec python scraper/scheduler.py
