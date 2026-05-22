import { useEffect, useMemo, useRef, useState } from 'react'
import { getEmail } from '../../utils/auth'
import { API_BASE as BASE } from '../../config'
import styles from './MyPlayers.module.css'

interface Player {
  playerId: number
  name: string
  team: string | null
}


function playerLabel(p: Player) {
  return p.team ? `${p.name} (${p.team})` : p.name
}

export default function MyPlayers() {
  const email = getEmail()
  const [players, setPlayers] = useState<Player[]>([])
  const [available, setAvailable] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [sortCol, setSortCol] = useState<'name' | 'team'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const searchRef = useRef<HTMLDivElement>(null)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [myRes, availRes] = await Promise.all([
        fetch(`${BASE}/api/players/my?email=${encodeURIComponent(email)}`),
        fetch(`${BASE}/api/players/available?email=${encodeURIComponent(email)}`),
      ])
      if (!myRes.ok || !availRes.ok) throw new Error('Failed to load players.')
      setPlayers(await myRes.json())
      setAvailable(await availRes.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [email])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function openModal() {
    setSelectedPlayer(null)
    setQuery('')
    setDropdownOpen(false)
    setModalOpen(true)
  }

  function pickPlayer(p: Player) {
    setSelectedPlayer(p)
    setQuery(playerLabel(p))
    setDropdownOpen(false)
  }

  async function handleAdd() {
    if (!selectedPlayer) return
    setAdding(true)
    await fetch(`${BASE}/api/players/my`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, playerId: selectedPlayer.playerId }),
    })
    await loadAll()
    setSelectedPlayer(null)
    setQuery('')
    setAdding(false)
  }

  async function handleRemove(playerId: number) {
    await fetch(`${BASE}/api/players/my/${playerId}?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
    })
    setPlayers(prev => prev.filter(p => p.playerId !== playerId))
    setAvailable(prev => {
      const removed = players.find(p => p.playerId === playerId)
      return removed ? [...prev, removed].sort((a, b) => a.name.localeCompare(b.name)) : prev
    })
  }

  const filtered = available.filter(p =>
    playerLabel(p).toLowerCase().includes(query.toLowerCase())
  )

  const sortedPlayers = useMemo(() =>
    [...players].sort((a, b) => {
      const va = sortCol === 'name' ? a.name : (a.team ?? '')
      const vb = sortCol === 'name' ? b.name : (b.team ?? '')
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    }),
    [players, sortCol, sortDir]
  )

  function sort(col: 'name' | 'team') {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function thClass(col: 'name' | 'team') {
    return `${styles.sortable} ${sortCol === col ? styles.active : ''}`
  }

  const indicator = (col: 'name' | 'team') =>
    sortCol === col ? <span className={styles.sortIndicator}>{sortDir === 'asc' ? '▲' : '▼'}</span> : null

  if (loading) return <div className={styles.state}>Loading…</div>
  if (error) return <div className={styles.state}>{error}</div>

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button className={styles.addBtn} onClick={openModal}>Add player +</button>
      </div>

      {!players.length ? (
        <p className={styles.empty}>You are not subscribed to any players yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={thClass('name')} onClick={() => sort('name')}>Player{indicator('name')}</th>
              <th className={thClass('team')} onClick={() => sort('team')}>Team{indicator('team')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map(p => (
              <tr key={p.playerId}>
                <td>{p.name}</td>
                <td>{p.team ?? <span className={styles.none}>—</span>}</td>
                <td>
                  <button className={styles.remove} onClick={() => handleRemove(p.playerId)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div className={styles.overlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Add Player</h3>

            <div className={styles.formGroup}>
              <label>Player</label>
              <div className={styles.searchWrapper} ref={searchRef}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search players…"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value)
                    setSelectedPlayer(null)
                    setDropdownOpen(true)
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  autoComplete="off"
                />
                {dropdownOpen && (
                  <div className={styles.searchDropdown}>
                    {filtered.length === 0 ? (
                      <p className={styles.searchEmpty}>No players found</p>
                    ) : (
                      filtered.map(p => (
                        <div
                          key={p.playerId}
                          className={`${styles.searchOption} ${selectedPlayer?.playerId === p.playerId ? styles.searchOptionActive : ''}`}
                          onMouseDown={() => pickPlayer(p)}
                        >
                          <span>{p.name}</span>
                          {p.team && <span className={styles.teamTag}>{p.team}</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
              <button
                className={styles.confirmBtn}
                onClick={handleAdd}
                disabled={!selectedPlayer || adding}
              >
                {adding ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
