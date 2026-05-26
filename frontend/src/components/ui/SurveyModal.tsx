import { useState } from 'react'
import { API_BASE } from '../../config'
import styles from './SurveyModal.module.css'

const OPTIONS = [
  { value: 1, label: "1) Not at all, I hadn't even noticed it" },
  { value: 2, label: "2) I noticed this issue, but it doesn't bother me" },
  { value: 3, label: "3) Bothers me somewhat, but doesn't stop me from using the site properly" },
  { value: 4, label: "4) Bothers me a lot, I constantly click on 'new' videos only to realize I already watched it" },
]

interface Props {
  email: string
  onClose: () => void
  onSubmit: () => void
}

export default function SurveyModal({ email, onClose, onSubmit }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!selected) return
    setSubmitting(true)
    try {
      await fetch(`${API_BASE}/api/survey/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, response: selected }),
      })
      onSubmit()
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <p className={styles.question}>
          Some POVs of popular matches are posted across different channels, and appear on the feed multiple times. On a scale of 1–4, how much is that an issue for you?
        </p>
        <div className={styles.options}>
          {OPTIONS.map(opt => (
            <label key={opt.value} className={`${styles.option} ${selected === opt.value ? styles.selected : ''}`}>
              <input
                type="radio"
                name="survey"
                value={opt.value}
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <div className={styles.actions}>
          <button className={styles.submit} onClick={handleSubmit} disabled={!selected || submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
          <button className={styles.later} onClick={onClose}>
            Ask me again later
          </button>
        </div>
      </div>
    </div>
  )
}
