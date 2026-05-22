import { useEffect, useState } from 'react'
import { fetchMyVideos, type VideoFilters } from '../services/videos'
import { getEmail } from '../utils/auth'
import type { Video } from '../types/video'

interface State {
  videos: Video[]
  total: number
  loading: boolean
  error: string | null
}

export function useMyVideos(page: number, pageSize: number, filters: VideoFilters = {}): State {
  const [state, setState] = useState<State>({ videos: [], total: 0, loading: true, error: null })
  const email = getEmail()

  useEffect(() => {
    let cancelled = false
    setState(s => ({ ...s, loading: true, error: null }))
    fetchMyVideos(email, page, pageSize, filters)
      .then(data => { if (!cancelled) setState({ ...data, loading: false, error: null }) })
      .catch(err => { if (!cancelled) setState(s => ({ ...s, loading: false, error: err.message })) })
    return () => { cancelled = true }
  }, [email, page, pageSize, filters.maps?.join(','), filters.matchType, filters.playerId])

  return state
}
