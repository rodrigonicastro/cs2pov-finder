import type { Video } from '../types/video'
import { API_BASE } from '../config'

export interface VideoPage {
  videos: Video[]
  total: number
}

export interface VideoFilters {
  maps?: string[]
  matchType?: string
  tRoleIds?: number[]
  ctRoleIds?: number[]
  playerId?: number
}

function buildParams(page: number, pageSize: number, filters: VideoFilters) {
  const p = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  filters.maps?.forEach(m => p.append('map', m))
  if (filters.matchType) p.set('match_type', filters.matchType)
  filters.tRoleIds?.forEach(id => p.append('t_role_id', String(id)))
  filters.ctRoleIds?.forEach(id => p.append('ct_role_id', String(id)))
  if (filters.playerId != null) p.set('player_id', String(filters.playerId))
  return p.toString()
}

export interface MapSideRole {
  mapRoleId: number
  role: string
  map: string
}

export async function fetchRolesBySide(side: string, maps: string[] = []): Promise<MapSideRole[]> {
  const p = new URLSearchParams({ side })
  maps.forEach(m => p.append('map', m))
  const res = await fetch(`${API_BASE}/api/roles/by-side?${p.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch roles')
  return res.json()
}

export async function fetchRolesByMapSide(map: string, side: string): Promise<MapSideRole[]> {
  const res = await fetch(`${API_BASE}/api/roles/by-map-side?map=${encodeURIComponent(map)}&side=${encodeURIComponent(side)}`)
  if (!res.ok) throw new Error('Failed to fetch roles')
  return res.json()
}

export async function fetchVideos(page: number, pageSize: number, filters: VideoFilters = {}): Promise<VideoPage> {
  const res = await fetch(`${API_BASE}/api/videos?${buildParams(page, pageSize, filters)}`)
  if (!res.ok) throw new Error(`Failed to fetch videos (${res.status})`)
  return res.json()
}

export async function fetchMyVideos(email: string, page: number, pageSize: number, filters: VideoFilters = {}): Promise<VideoPage> {
  const params = buildParams(page, pageSize, filters)
  const res = await fetch(`${API_BASE}/api/videos/my?email=${encodeURIComponent(email)}&${params}`)
  if (!res.ok) throw new Error(`Failed to fetch videos (${res.status})`)
  return res.json()
}

export async function fetchPlayersInMyVideos(
  email: string,
  maps: string[] = [],
  matchType?: string,
  tRoleIds: number[] = [],
  ctRoleIds: number[] = [],
): Promise<PlayerOption[]> {
  const p = new URLSearchParams({ email })
  maps.forEach(m => p.append('map', m))
  if (matchType) p.set('match_type', matchType)
  tRoleIds.forEach(id => p.append('t_role_id', String(id)))
  ctRoleIds.forEach(id => p.append('ct_role_id', String(id)))
  const res = await fetch(`${API_BASE}/api/players/in-my-videos?${p}`)
  if (!res.ok) throw new Error('Failed to fetch players')
  return res.json()
}

export async function fetchMaps(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/maps`)
  if (!res.ok) throw new Error('Failed to fetch maps')
  return res.json()
}

export interface PlayerOption {
  playerId: number
  name: string
  team: string | null
}

export async function fetchAllPlayers(): Promise<PlayerOption[]> {
  const res = await fetch(`${API_BASE}/api/players/all`)
  if (!res.ok) throw new Error('Failed to fetch players')
  return res.json()
}

export async function fetchPlayersInVideos(
  maps: string[] = [],
  matchType?: string,
  tRoleIds: number[] = [],
  ctRoleIds: number[] = [],
): Promise<PlayerOption[]> {
  const p = new URLSearchParams()
  maps.forEach(m => p.append('map', m))
  if (matchType) p.set('match_type', matchType)
  tRoleIds.forEach(id => p.append('t_role_id', String(id)))
  ctRoleIds.forEach(id => p.append('ct_role_id', String(id)))
  const res = await fetch(`${API_BASE}/api/players/in-videos?${p}`)
  if (!res.ok) throw new Error('Failed to fetch players')
  return res.json()
}
