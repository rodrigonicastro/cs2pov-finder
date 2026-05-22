import { useState } from 'react'
import MultiSelect from '../../components/ui/MultiSelect'
import SingleSelect from '../../components/ui/SingleSelect'
import { API_BASE } from '../../config'
import styles from './RegisterQuestionnaire.module.css'

interface Question {
  id: string
  label: string
  options: string[]
}

const QUESTIONS: Question[] = [
  {
    id: 'role',
    label: 'What roles do you want to watch?',
    options: ['Entry Fragger/Playmaker', 'AWPer', 'Anchor', 'Lurker', 'IGL'],
  },
  {
    id: 'experience',
    label: 'What experience do you have in CS2?',
    options: ['I\'m a casual player', 'I play amateur tournaments', 'I play at semi-pro level', 'I\'m a professional', 'I\'m a coach looking to help my team', 'I\'m a content creator'],
  },
  {
    id: 'match_type_preference',
    label: 'What types of POVs do you want to watch?',
    options: ['FACEIT pugs', 'Pro matches', 'Both'],
  },
  {
    id: 'notify',
    label: 'Do you want to get notified of new videos that match your preferences?',
    options: ['Yes', 'No'],
  },
]

interface Props {
  email: string
  onDone: () => void
}

const ROLE_OPTIONS = QUESTIONS.find(q => q.id === 'role')!.options.map(o => ({ value: o, label: o }))
const OTHER_QUESTIONS = QUESTIONS.filter(q => q.id !== 'role')

export default function RegisterQuestionnaire({ email, onDone }: Props) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function set(id: string, value: string) {
    setAnswers(a => ({ ...a, [id]: value }))
  }

  async function submit() {
    setSubmitting(true)
    try {
      await fetch(`${API_BASE}/api/auth/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          roles: selectedRoles,
          experience: answers.experience ?? null,
          match_type_preference: answers.match_type_preference ?? null,
          notify: answers.notify ?? null,
        }),
      })
    } finally {
      setSubmitting(false)
      onDone()
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.step}>Almost there</span>
          <h2 className={styles.title}>Tell us about yourself</h2>
          <p className={styles.subtitle}>
            Help us personalise your experience. You can change these later.
          </p>
        </div>

        <div className={styles.questions}>
          {/* Role question — multiselect */}
          <div className={styles.question}>
            <label className={styles.label}>
              <span className={styles.num}>1</span>
              {QUESTIONS.find(q => q.id === 'role')!.label}
            </label>
            <MultiSelect
              options={ROLE_OPTIONS}
              selected={selectedRoles}
              onChange={vals => setSelectedRoles(vals as string[])}
              placeholder="Select roles…"
              fullWidth
            />
          </div>

          {/* Remaining questions — single select */}
          {OTHER_QUESTIONS.map((q, i) => (
            <div key={q.id} className={styles.question}>
              <label className={styles.label}>
                <span className={styles.num}>{i + 2}</span>
                {q.label}
              </label>
              <SingleSelect
                options={q.options.map(o => ({ value: o, label: o }))}
                value={answers[q.id] ?? ''}
                onChange={val => set(q.id, val)}
                placeholder="Select an option…"
                fullWidth
              />
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.submit} onClick={submit} disabled={submitting}>
            {submitting ? '…' : 'Get started →'}
          </button>
          <button className={styles.skip} onClick={onDone} disabled={submitting}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
