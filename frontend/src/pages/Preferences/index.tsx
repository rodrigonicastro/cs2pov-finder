import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MultiSelect from '../../components/ui/MultiSelect'
import SingleSelect from '../../components/ui/SingleSelect'
import UserMenu from '../../components/layout/UserMenu'
import { getEmail } from '../../utils/auth'
import styles from './Preferences.module.css'

import { API_BASE as BASE } from '../../config'

const EXPERIENCE_OPTIONS = [
  { value: "I'm a casual player",                  dbValue: 'casual' },
  { value: 'I play amateur tournaments',            dbValue: 'amateur' },
  { value: 'I play at semi-pro level',              dbValue: 'semi-pro' },
  { value: "I'm a professional",                    dbValue: 'pro' },
  { value: "I'm a coach looking to help my team",  dbValue: 'coach' },
  { value: "I'm a content creator",                dbValue: 'content_creator' },
]

const MATCH_TYPE_OPTIONS = [
  { value: 'FACEIT pugs',  dbValue: 'faceit' },
  { value: 'Pro matches',  dbValue: 'tournament' },
  { value: 'Both',         dbValue: 'both' },
]

const NOTIFY_OPTIONS = [
  { value: 'Yes', dbValue: 'yes' },
  { value: 'No',  dbValue: 'no' },
]

const ROLE_OPTIONS = [
  'Entry Fragger/Playmaker',
  'AWPer',
  'Anchor',
  'Lurker',
  'IGL',
].map(r => ({ value: r, label: r }))

function toLabel(options: { value: string; dbValue: string }[], dbValue: string | null) {
  return options.find(o => o.dbValue === dbValue)?.value ?? ''
}

export default function Preferences() {
  const email = getEmail()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [experience, setExperience] = useState('')
  const [matchTypePref, setMatchTypePref] = useState('')
  const [notify, setNotify] = useState('')

  useEffect(() => {
    fetch(`${BASE}/api/auth/preferences?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        setSelectedRoles(data.preferred_roles ?? [])
        setExperience(toLabel(EXPERIENCE_OPTIONS, data.experience))
        setMatchTypePref(toLabel(MATCH_TYPE_OPTIONS, data.match_type_preference))
        setNotify(toLabel(NOTIFY_OPTIONS, data.notify))
        setLoading(false)
      })
      .catch(() => { setError('Failed to load preferences.'); setLoading(false) })
  }, [email])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`${BASE}/api/auth/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          roles: selectedRoles,
          experience: experience || null,
          match_type_preference: matchTypePref || null,
          notify: notify || null,
        }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Failed to save preferences.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/videos')}>← Back</button>
        <UserMenu />
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Preferences</h1>
          <p className={styles.subtitle}>Update your viewing preferences at any time.</p>

          {loading ? (
            <p className={styles.state}>Loading…</p>
          ) : (
            <div className={styles.fields}>
              <div className={styles.field}>
                <label>What roles do you want to watch?</label>
                <MultiSelect
                  options={ROLE_OPTIONS}
                  selected={selectedRoles}
                  onChange={vals => setSelectedRoles(vals as string[])}
                  placeholder="Select roles…"
                  fullWidth
                />
                <span className={styles.hint}>
                  Selecting roles adds the corresponding players to My Players.
                </span>
              </div>

              <div className={styles.field}>
                <label>What experience do you have in CS2?</label>
                <SingleSelect
                  options={EXPERIENCE_OPTIONS.map(o => ({ value: o.value, label: o.value }))}
                  value={experience}
                  onChange={setExperience}
                  placeholder="Select…"
                  fullWidth
                />
              </div>

              <div className={styles.field}>
                <label>What types of POVs do you want to watch?</label>
                <SingleSelect
                  options={MATCH_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.value }))}
                  value={matchTypePref}
                  onChange={setMatchTypePref}
                  placeholder="Select…"
                  fullWidth
                />
              </div>

              <div className={styles.field}>
                <label>Do you want to get notified of new videos that match your preferences?</label>
                <SingleSelect
                  options={NOTIFY_OPTIONS.map(o => ({ value: o.value, label: o.value }))}
                  value={notify}
                  onChange={setNotify}
                  placeholder="Select…"
                  fullWidth
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.actions}>
                {saved && <span className={styles.savedMsg}>Saved!</span>}
                <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
