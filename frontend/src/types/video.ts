export interface Video {
  id: number
  title: string
  url: string
  thumbnailUrl: string | null
  publishedAt: string | null
  tRole: string | null
  ctRole: string | null
  map: string | null
  matchType: 'FACEIT' | 'TOURNAMENT' | null
}
