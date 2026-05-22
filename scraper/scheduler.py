import asyncio
import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv

load_dotenv()

from db.database import AsyncSessionLocal
from scraper import skybox, youtube

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


async def _run_skybox() -> None:
    log.info("Skybox scraper starting")
    async with AsyncSessionLocal() as session:
        await skybox.scrape(session)
    log.info("Skybox scraper done")


async def _run_youtube() -> None:
    log.info("YouTube poller starting")
    async with AsyncSessionLocal() as session:
        await youtube.poll(session)
    log.info("YouTube poller done")


async def main() -> None:
    scheduler = AsyncIOScheduler()

    # Skybox: once a week on Monday at 03:00 UTC
    scheduler.add_job(_run_skybox, "cron", day_of_week="mon", hour=3, minute=0, misfire_grace_time=3600)

    # YouTube: every hour
    scheduler.add_job(_run_youtube, "interval", hours=1, misfire_grace_time=300)

    scheduler.start()
    log.info("Scheduler started — Skybox weekly (Mon 03:00 UTC), YouTube every hour")

    # Run YouTube once immediately on startup so we don't wait up to an hour
    await _run_youtube()

    try:
        await asyncio.Event().wait()
    except (KeyboardInterrupt, SystemExit):
        log.info("Shutting down")
        scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
