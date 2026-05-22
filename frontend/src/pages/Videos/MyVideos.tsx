import { useEffect, useState } from 'react'
import PlayerSelectFilter from '../../components/ui/PlayerSelectFilter'
import VideoFilterBar from '../../components/ui/VideoFilterBar'
import VideoGrid from '../../components/ui/VideoGrid'
import { useMyVideos } from '../../hooks/useMyVideos'
import { getEmail } from '../../utils/auth'
import { fetchPlayersInMyVideos, type PlayerOption, type VideoFilters } from '../../services/videos'
import { API_BASE } from '../../config'
import styles from './MyVideos.module.css'

const PAGE_SIZE = 20

const PREF_TO_MATCH_TYPE: Record<string, string> = {
  faceit: 'FACEIT',
  tournament: 'TOURNAMENT',
}

export default function MyVideos() {
  const email = getEmail()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<VideoFilters>({})
  const [prefLoaded, setPrefLoaded] = useState(false)
  const [players, setPlayers] = useState<PlayerOption[]>([])

  const playerFilterKey = [email, filters.maps?.join(',') ?? '', filters.matchType ?? ''].join('|')

  useEffect(() => {
    if (!email) return
    fetchPlayersInMyVideos(email, filters.maps ?? [], filters.matchType)
      .then(ps => {
        setPlayers(ps)
        if (filters.playerId != null && !ps.some(p => p.playerId === filters.playerId)) {
          setFilters(f => ({ ...f, playerId: undefined }))
        }
      })
      .catch(() => {})
  }, [playerFilterKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/preferences?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        const matchType = PREF_TO_MATCH_TYPE[data.match_type_preference] as string | undefined
        setFilters(f => ({ ...f, matchType }))
      })
      .catch(() => {})
      .finally(() => setPrefLoaded(true))
  }, [email])

  const { videos, total, loading, error } = useMyVideos(page, PAGE_SIZE, filters)

  function handleFilterChange(next: VideoFilters) {
    setFilters(next)
    setPage(1)
  }

  const showFaceitWarning = !filters.matchType || filters.matchType === 'FACEIT'

  return (
    <>
      <div className={styles.filterRow}>
        <VideoFilterBar filters={filters} onChange={handleFilterChange} />
        <PlayerSelectFilter
          players={players}
          selected={filters.playerId}
          onChange={playerId => { setFilters(f => ({ ...f, playerId })); setPage(1) }}
        />
      </div>
      {showFaceitWarning && (
        <p className={styles.faceitWarning}>
          ⚠ FACEIT matches are "pick-up-games", so the roles played in those videos may not match the roles that player fulfills in official matches.
        </p>
      )}
      {prefLoaded && (
        <VideoGrid
          videos={videos}
          total={total}
          loading={loading}
          error={error}
          page={page}
          onPageChange={setPage}
          pageSize={PAGE_SIZE}
        />
      )}
    </>
  )
}
