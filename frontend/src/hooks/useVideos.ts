import { useEffect, useState } from 'react'
import { fetchVideos, type VideoFilters } from '../services/videos'
import type { Video } from '../types/video'

interface State {
  videos: Video[]
  total: number
  loading: boolean
  error: string | null
}

export function useVideos(page: number, pageSize: number, filters: VideoFilters = {}, email?: string): State {
  const [state, setState] = useState<State>({ videos: [], total: 0, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setState(s => ({ ...s, loading: true, error: null }))
    fetchVideos(page, pageSize, filters, email)
      .then(data => { if (!cancelled) setState({ ...data, loading: false, error: null }) })
      .catch(err => { if (!cancelled) setState(s => ({ ...s, loading: false, error: err.message })) })
    return () => { cancelled = true }
  }, [page, pageSize, filters.maps?.join(','), filters.matchType, filters.tRoleIds?.join(','), filters.ctRoleIds?.join(','), filters.playerId])

  return state
}
