import { useEffect, useState } from 'react'
import { fetchMaps } from '../../services/videos'
import type { VideoFilters } from '../../services/videos'
import MultiSelect from './MultiSelect'
import SingleSelect from './SingleSelect'
import styles from './VideoFilterBar.module.css'

const MATCH_TYPE_OPTIONS = [
  { value: 'FACEIT', label: 'FACEIT' },
  { value: 'TOURNAMENT', label: 'TOURNAMENT' },
]

interface Props {
  filters: VideoFilters
  onChange: (filters: VideoFilters) => void
  showMatchType?: boolean
}

export default function VideoFilterBar({ filters, onChange, showMatchType = true }: Props) {
  const [maps, setMaps] = useState<string[]>([])

  useEffect(() => {
    fetchMaps().then(setMaps).catch(() => {})
  }, [])

  const mapOptions = maps.map(m => ({ value: m, label: m }))

  return (
    <div className={styles.bar}>
      <MultiSelect
        options={mapOptions}
        selected={filters.maps ?? []}
        onChange={vals => onChange({ ...filters, maps: vals.length ? (vals as string[]) : undefined })}
        placeholder="All maps"
      />
      {showMatchType && (
        <SingleSelect
          options={MATCH_TYPE_OPTIONS}
          value={filters.matchType ?? ''}
          onChange={val => onChange({ ...filters, matchType: val || undefined })}
          placeholder="All match types"
        />
      )}
    </div>
  )
}
