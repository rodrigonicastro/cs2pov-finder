import { useEffect, useState } from 'react'
import type { MapSideRole } from '../../services/videos'
import { fetchRolesBySide } from '../../services/videos'
import { API_BASE } from '../../config'
import styles from './MapRoleSelector.module.css'

function formatRole(name: string): string {
  return name.replace(/_/g, ' ').toUpperCase()
}

interface Props {
  email: string
  onBack: () => void
  onDone: () => void
}

interface MapData {
  name: string
  tRoles: MapSideRole[]
  ctRoles: MapSideRole[]
}

export default function MapRoleSelector({ email, onBack, onDone }: Props) {
  const [maps, setMaps] = useState<MapData[]>([])
  const [loading, setLoading] = useState(true)
  const [mapIndex, setMapIndex] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([fetchRolesBySide('T'), fetchRolesBySide('CT')]).then(([tAll, ctAll]) => {
      const mapNames = [...new Set([...tAll, ...ctAll].map(r => r.map))].sort()
      const built: MapData[] = mapNames.map(name => ({
        name,
        tRoles: tAll.filter(r => r.map === name),
        ctRoles: ctAll.filter(r => r.map === name),
      }))
      setMaps(built)
      setLoading(false)
    })
  }, [])

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function complete() {
    setSubmitting(true)
    try {
      if (selected.size > 0) {
        await fetch(`${API_BASE}/api/roles/my/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, mapRoleIds: [...selected] }),
        })
      }
    } finally {
      setSubmitting(false)
      onDone()
    }
  }

  const isFirst = mapIndex === 0
  const isLast = mapIndex === maps.length - 1
  const current = maps[mapIndex]

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {loading ? (
          <p className={styles.loading}>Loading maps…</p>
        ) : (
          <>
            <div className={styles.header}>
              <span className={styles.step}>
                Map {mapIndex + 1} of {maps.length}
              </span>
              <h2 className={styles.title}>{current.name}</h2>
              <p className={styles.subtitle}>
                Select the roles you want to follow on this map.
              </p>
            </div>

            <div className={styles.columns}>
              <div className={styles.column}>
                <h3 className={styles.sideLabel + ' ' + styles.tLabel}>T Side</h3>
                <div className={styles.roleList}>
                  {current.tRoles.map(r => (
                    <button
                      key={r.mapRoleId}
                      className={
                        styles.pill +
                        (selected.has(r.mapRoleId) ? ' ' + styles.pillT : '')
                      }
                      onClick={() => toggle(r.mapRoleId)}
                      type="button"
                    >
                      {formatRole(r.role)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.column}>
                <h3 className={styles.sideLabel + ' ' + styles.ctLabel}>CT Side</h3>
                <div className={styles.roleList}>
                  {current.ctRoles.map(r => (
                    <button
                      key={r.mapRoleId}
                      className={
                        styles.pill +
                        (selected.has(r.mapRoleId) ? ' ' + styles.pillCT : '')
                      }
                      onClick={() => toggle(r.mapRoleId)}
                      type="button"
                    >
                      {formatRole(r.role)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <button
                className={styles.skip}
                onClick={onDone}
                disabled={submitting}
                type="button"
              >
                Skip this step
              </button>

              <div className={styles.nav}>
                <button
                  className={styles.navBtn}
                  onClick={isFirst ? onBack : () => setMapIndex(i => i - 1)}
                  disabled={submitting}
                  type="button"
                >
                  ← Back
                </button>

                {isLast ? (
                  <button
                    className={styles.complete}
                    onClick={complete}
                    disabled={submitting}
                    type="button"
                  >
                    {submitting ? '…' : 'Complete registration'}
                  </button>
                ) : (
                  <button
                    className={styles.navBtn + ' ' + styles.navBtnPrimary}
                    onClick={() => setMapIndex(i => i + 1)}
                    type="button"
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
