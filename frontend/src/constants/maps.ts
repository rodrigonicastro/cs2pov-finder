// Current competitive map pool. Kept separate from the `maps` table because
// the table isn't pruned when a map rotates out (see db/seed.py) — update
// this list when the pool changes instead.
export const ACTIVE_MAPS = ['ANCIENT', 'ANUBIS', 'CACHE', 'DUST2', 'INFERNO', 'MIRAGE', 'NUKE']
