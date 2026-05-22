import { useEffect, useMemo, useState } from 'react'
import MultiSelect from '../../components/ui/MultiSelect'
import SingleSelect from '../../components/ui/SingleSelect'
import { getEmail } from '../../utils/auth'
import { API_BASE as BASE } from '../../config'
import styles from './MyRoles.module.css'

interface Role {
  mapRoleId: number
  map: string
  side: string
  role: string
}


export default function MyRoles() {
  const email = getEmail()
  const [roles, setRoles] = useState<Role[]>([])
  const [available, setAvailable] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [filterMaps, setFilterMaps] = useState<string[]>([])
  const [filterSide, setFilterSide] = useState('')
  const [sortCol, setSortCol] = useState<'map' | 'side' | 'role'>('map')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [selectedMap, setSelectedMap] = useState('')
  const [selectedSide, setSelectedSide] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('')
  const [adding, setAdding] = useState(false)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [myRes, availRes] = await Promise.all([
        fetch(`${BASE}/api/roles/my?email=${encodeURIComponent(email)}`),
        fetch(`${BASE}/api/roles/available?email=${encodeURIComponent(email)}`),
      ])
      if (!myRes.ok || !availRes.ok) throw new Error('Failed to load roles.')
      setRoles(await myRes.json())
      setAvailable(await availRes.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [email])

  function openModal() {
    setSelectedMap('')
    setSelectedSide('')
    setSelectedRoleId('')
    setModalOpen(true)
  }

  async function handleAdd() {
    if (!selectedRoleId) return
    setAdding(true)
    await fetch(`${BASE}/api/roles/my`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, mapRoleId: selectedRoleId }),
    })
    await loadAll()
    setAdding(false)
  }

  async function handleRemove(mapRoleId: number) {
    await fetch(`${BASE}/api/roles/my/${mapRoleId}?email=${encodeURIComponent(email)}`, { method: 'DELETE' })
    setRoles(prev => prev.filter(r => r.mapRoleId !== mapRoleId))
    setAvailable(prev => {
      const removed = roles.find(r => r.mapRoleId === mapRoleId)
      return removed ? [...prev, removed].sort((a, b) => a.map.localeCompare(b.map) || a.side.localeCompare(b.side)) : prev
    })
  }

  const allRoles = useMemo(() => [...roles, ...available], [roles, available])
  const allMaps = useMemo(() => [...new Set(allRoles.map(r => r.map))].sort(), [allRoles])
  const filterSides = useMemo(() =>
    [...new Set(allRoles.filter(r => !filterMaps.length || filterMaps.includes(r.map)).map(r => r.side))].sort(),
    [allRoles, filterMaps]
  )
  const visibleRoles = useMemo(() => {
    const filtered = roles.filter(r =>
      (!filterMaps.length || filterMaps.includes(r.map)) &&
      (!filterSide || r.side === filterSide)
    )
    return [...filtered].sort((a, b) => {
      const va = sortCol === 'map' ? a.map : sortCol === 'side' ? a.side : a.role
      const vb = sortCol === 'map' ? b.map : sortCol === 'side' ? b.side : b.role
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [roles, filterMaps, filterSide, sortCol, sortDir])

  const maps = useMemo(() => [...new Set(available.map(r => r.map))].sort(), [available])
  const sides = useMemo(() =>
    [...new Set(available.filter(r => r.map === selectedMap).map(r => r.side))].sort(),
    [available, selectedMap]
  )
  const roleOptions = useMemo(() =>
    available.filter(r => r.map === selectedMap && r.side === selectedSide),
    [available, selectedMap, selectedSide]
  )

  function sort(col: 'map' | 'side' | 'role') {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function thClass(col: 'map' | 'side' | 'role') {
    return `${styles.sortable} ${sortCol === col ? styles.active : ''}`
  }

  const indicator = (col: 'map' | 'side' | 'role') =>
    sortCol === col ? <span className={styles.sortIndicator}>{sortDir === 'asc' ? '▲' : '▼'}</span> : null

  if (loading) return <div className={styles.state}>Loading…</div>
  if (error) return <div className={styles.state}>{error}</div>

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <MultiSelect
            options={allMaps.map(m => ({ value: m, label: m }))}
            selected={filterMaps}
            onChange={vals => { setFilterMaps(vals as string[]); setFilterSide('') }}
            placeholder="All maps"
          />
          <SingleSelect
            options={filterSides.map(s => ({ value: s, label: s }))}
            value={filterSide}
            onChange={setFilterSide}
            placeholder="All sides"
            disabled={!allMaps.length}
          />
        </div>
        <button className={styles.addBtn} onClick={openModal}>Add role +</button>
      </div>

      {!roles.length ? (
        <p className={styles.empty}>You haven't subscribed to any roles yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={thClass('map')} onClick={() => sort('map')}>Map{indicator('map')}</th>
              <th className={thClass('side')} onClick={() => sort('side')}>Side{indicator('side')}</th>
              <th className={thClass('role')} onClick={() => sort('role')}>Role{indicator('role')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibleRoles.map(r => (
              <tr key={r.mapRoleId}>
                <td>{r.map}</td>
                <td>
                  <span className={r.side === 'T' ? styles.sideT : styles.sideCT}>{r.side}</span>
                </td>
                <td>{r.role.replace(/_/g, ' ').toUpperCase()}</td>
                <td>
                  <button className={styles.remove} onClick={() => handleRemove(r.mapRoleId)}>
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
            <h3 className={styles.modalTitle}>Add Role</h3>

            <div className={styles.formGroup}>
              <label>Map</label>
              <select value={selectedMap} onChange={e => { setSelectedMap(e.target.value); setSelectedSide(''); setSelectedRoleId('') }}>
                <option value="">Select map…</option>
                {maps.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Side</label>
              <select value={selectedSide} onChange={e => { setSelectedSide(e.target.value); setSelectedRoleId('') }} disabled={!selectedMap}>
                <option value="">Select side…</option>
                {sides.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Role</label>
              <select value={selectedRoleId} onChange={e => setSelectedRoleId(Number(e.target.value))} disabled={!selectedSide}>
                <option value="">Select role…</option>
                {roleOptions.map(r => (
                  <option key={r.mapRoleId} value={r.mapRoleId}>
                    {r.role.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
              <button className={styles.confirmBtn} onClick={handleAdd} disabled={!selectedRoleId || adding}>
                {adding ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
