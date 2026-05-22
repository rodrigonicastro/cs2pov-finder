import asyncio

from sqlalchemy.dialects.postgresql import insert

from db.database import engine
from db.models import Map

MAPS = [
    "OVERPASS",
    "ANCIENT",
    "INFERNO",
    "MIRAGE",
    "ANUBIS",
    "DUST2",
    "NUKE"
]


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.execute(
            insert(Map).values([{"name": m} for m in MAPS]).on_conflict_do_nothing(index_elements=["name"])
        )
    print(f"Seeded {len(MAPS)} maps.")


if __name__ == "__main__":
    asyncio.run(seed())
