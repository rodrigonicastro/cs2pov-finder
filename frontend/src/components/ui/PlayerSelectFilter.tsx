import { useEffect, useRef, useState } from 'react'
import type { PlayerOption } from '../../services/videos'
import styles from './PlayerSelectFilter.module.css'

interface Props {
  players: PlayerOption[]
  selected: number | undefined
  onChange: (playerId: number | undefined) => void
}

export default function PlayerSelectFilter({ players, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedPlayer = selected != null ? players.find(p => p.playerId === selected) : undefined

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const filtered = query
    ? players.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.team ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : players

  function pick(p: PlayerOption) {
    onChange(p.playerId)
    setOpen(false)
    setQuery('')
  }

  function clear() {
    onChange(undefined)
    setOpen(false)
    setQuery('')
  }

  if (selectedPlayer) {
    return (
      <div className={styles.wrapper} ref={wrapperRef}>
        <div className={styles.selected}>
          <span className={styles.selectedName}>{selectedPlayer.name}</span>
          <button className={styles.clearBtn} onClick={clear} title="Clear">×</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <input
        className={styles.input}
        placeholder="All players"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className={styles.dropdown}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>No players found</p>
          ) : (
            filtered.map(p => (
              <div
                key={p.playerId}
                className={styles.option}
                onMouseDown={() => pick(p)}
              >
                <span>{p.name}</span>
                {p.team && <span className={styles.teamTag}>{p.team}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
