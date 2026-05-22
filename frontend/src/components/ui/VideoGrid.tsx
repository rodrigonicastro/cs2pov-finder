import type { Video } from '../../types/video'
import styles from './VideoGrid.module.css'

interface Props {
  videos: Video[]
  total: number
  loading: boolean
  error: string | null
  page: number
  onPageChange: (page: number) => void
  pageSize: number
}

function formatRole(role: string) {
  return role.replace(/_/g, ' ').toUpperCase()
}

export default function VideoGrid({ videos, total, loading, error, page, onPageChange, pageSize }: Props) {
  const totalPages = Math.ceil(total / pageSize)

  if (loading) return <div className={styles.state}>Loading…</div>
  if (error) return <div className={styles.state}>{error}</div>
  if (!videos.length) return <div className={styles.state}>No videos found.</div>

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {videos.map(video => (
          <a
            key={video.id}
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className={styles.card}
          >
            <div className={styles.thumbnail}>
              {video.thumbnailUrl
                ? <img src={video.thumbnailUrl} alt={video.title} loading="lazy" />
                : <div className={styles.noThumb} />}
            </div>
            <div className={styles.info}>
              <p className={styles.title}>{video.title}</p>
              {(video.tRole || video.ctRole || video.map || video.matchType) && (
                <div className={styles.chips}>
                  {video.tRole && <span className={styles.tRole}>{formatRole(video.tRole)}</span>}
                  {video.ctRole && <span className={styles.ctRole}>{formatRole(video.ctRole)}</span>}
                  {video.map && <span className={styles.mapChip}>{video.map}</span>}
                    {video.matchType && (
                    <span className={video.matchType === 'FACEIT' ? styles.faceit : styles.tournament}>
                    {video.matchType}
                    </span>
                )}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button onClick={() => onPageChange(page - 1)} disabled={page === 1}>← Prev</button>
          <span>{page} / {totalPages}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>Next →</button>
        </div>
      )}
    </div>
  )
}
