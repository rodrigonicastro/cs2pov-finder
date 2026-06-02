import { useEffect, useState } from 'react'
import MultiSelect from '../../components/ui/MultiSelect'
import PlayerSelectFilter from '../../components/ui/PlayerSelectFilter'
import VideoFilterBar from '../../components/ui/VideoFilterBar'
import VideoGrid from '../../components/ui/VideoGrid'
import { useVideos } from '../../hooks/useVideos'
import { fetchRolesBySide, fetchPlayersInVideos, type MapSideRole, type PlayerOption, type VideoFilters } from '../../services/videos'
import { getEmail } from '../../utils/auth'
import styles from './AllVideos.module.css'

const PAGE_SIZE = 20
const MAJOR_KEYWORDS = ['major', 'cologne']

function roleLabel(r: MapSideRole, multiMap: boolean) {
  const name = r.role.replace(/_/g, ' ').toUpperCase()
  return multiMap ? `${r.map} – ${name}` : name
}

export default function MajorVideos() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<VideoFilters>({ titleKeywords: MAJOR_KEYWORDS })
  const [tRoles, setTRoles] = useState<MapSideRole[]>([])
  const [ctRoles, setCtRoles] = useState<MapSideRole[]>([])
  const [selectedTRoleIds, setSelectedTRoleIds] = useState<number[]>([])
  const [selectedCtRoleIds, setSelectedCtRoleIds] = useState<number[]>([])
  const [players, setPlayers] = useState<PlayerOption[]>([])

  const { videos, total, loading, error } = useVideos(page, PAGE_SIZE, filters, getEmail())

  const mapsKey = filters.maps?.join(',') ?? ''
  const playerFilterKey = [mapsKey, selectedTRoleIds.join(','), selectedCtRoleIds.join(',')].join('|')

  useEffect(() => {
    fetchPlayersInVideos(filters.maps ?? [], undefined, selectedTRoleIds, selectedCtRoleIds, MAJOR_KEYWORDS)
      .then(ps => {
        setPlayers(ps)
        if (filters.playerId != null && !ps.some(p => p.playerId === filters.playerId)) {
          setFilters(f => ({ ...f, playerId: undefined }))
        }
      })
      .catch(() => {})
  }, [playerFilterKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const maps = filters.maps ?? []
    Promise.all([fetchRolesBySide('T', maps), fetchRolesBySide('CT', maps)])
      .then(([t, ct]) => { setTRoles(t); setCtRoles(ct) })
      .catch(() => { setTRoles([]); setCtRoles([]) })
    setSelectedTRoleIds([])
    setSelectedCtRoleIds([])
  }, [mapsKey])

  function handleFilterChange(next: VideoFilters) {
    const nextMapsKey = next.maps?.join(',') ?? ''
    if (nextMapsKey !== mapsKey) {
      setSelectedTRoleIds([])
      setSelectedCtRoleIds([])
      next = { ...next, tRoleIds: undefined, ctRoleIds: undefined }
    }
    setFilters({ ...next, titleKeywords: MAJOR_KEYWORDS })
    setPage(1)
  }

  function handleTRoleChange(ids: (string | number)[]) {
    const numIds = ids.map(Number)
    setSelectedTRoleIds(numIds)
    setFilters(f => ({ ...f, tRoleIds: numIds.length ? numIds : undefined }))
    setPage(1)
  }

  function handleCtRoleChange(ids: (string | number)[]) {
    const numIds = ids.map(Number)
    setSelectedCtRoleIds(numIds)
    setFilters(f => ({ ...f, ctRoleIds: numIds.length ? numIds : undefined }))
    setPage(1)
  }

  const multiMap = (filters.maps?.length ?? 0) !== 1
  const tOptions = tRoles.map(r => ({ value: r.mapRoleId, label: roleLabel(r, multiMap) }))
  const ctOptions = ctRoles.map(r => ({ value: r.mapRoleId, label: roleLabel(r, multiMap) }))

  return (
    <>
      <div className={styles.filterRow}>
        <VideoFilterBar filters={filters} onChange={handleFilterChange} showMatchType={false} />
        <MultiSelect
          options={tOptions}
          selected={selectedTRoleIds}
          onChange={handleTRoleChange}
          placeholder="T roles"
        />
        <MultiSelect
          options={ctOptions}
          selected={selectedCtRoleIds}
          onChange={handleCtRoleChange}
          placeholder="CT roles"
        />
        <PlayerSelectFilter
          players={players}
          selected={filters.playerId}
          onChange={playerId => { setFilters(f => ({ ...f, playerId })); setPage(1) }}
        />
      </div>
      <VideoGrid
        videos={videos}
        total={total}
        loading={loading}
        error={error}
        page={page}
        onPageChange={setPage}
        pageSize={PAGE_SIZE}
      />
    </>
  )
}
