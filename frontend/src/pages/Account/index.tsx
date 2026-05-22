import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserMenu from '../../components/layout/UserMenu'
import { getEmail, updateSession, clearSession } from '../../utils/auth'
import styles from './Account.module.css'

import { API_BASE as BASE } from '../../config'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(value)
}

export default function Account() {
  const navigate = useNavigate()
  const email = getEmail()

  const [username, setUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [origUsername, setOrigUsername] = useState('')
  const [origEmail, setOrigEmail] = useState('')

  useEffect(() => {
    fetch(`${BASE}/api/auth/preferences?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        setUsername(data.username)
        setOrigUsername(data.username)
        setNewEmail(email)
        setOrigEmail(email)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load account info.'); setLoading(false) })
  }, [email])

  const emailError = emailTouched && !isValidEmail(newEmail)
    ? 'Please enter a valid email address.'
    : null

  const isDirty = username !== origUsername || newEmail !== origEmail

  async function handleSave() {
    setEmailTouched(true)
    if (!isValidEmail(newEmail)) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch(`${BASE}/api/auth/account`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          new_username: username !== origUsername ? username : undefined,
          new_email: newEmail !== origEmail ? newEmail : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail ?? 'Failed to save.')
        return
      }
      const data = await res.json()
      updateSession(data.email, data.username)
      setOrigUsername(data.username)
      setOrigEmail(data.email)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`${BASE}/api/auth/account?email=${encodeURIComponent(origEmail)}`, {
        method: 'DELETE',
      })
      clearSession()
      navigate('/login')
    } catch {
      setError('Could not reach the server.')
      setDeleting(false)
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
          <h1 className={styles.title}>My Account</h1>
          <p className={styles.subtitle}>Manage your username and email address.</p>

          {loading ? (
            <p className={styles.state}>Loading…</p>
          ) : (
            <>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    className={styles.input}
                  />
                  {emailError && <p className={styles.error}>{emailError}</p>}
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <div className={styles.actions}>
                  {saved && <span className={styles.savedMsg}>Saved!</span>}
                  <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>

              <div className={styles.danger}>
                <h2 className={styles.dangerTitle}>Danger Zone</h2>
                {!confirmDelete ? (
                  <div className={styles.dangerRow}>
                    <div>
                      <p className={styles.dangerLabel}>Delete account</p>
                      <p className={styles.dangerHint}>
                        Permanently removes your account and all associated data.
                      </p>
                    </div>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete account
                    </button>
                  </div>
                ) : (
                  <div className={styles.confirmRow}>
                    <p className={styles.confirmText}>
                      Are you sure? This cannot be undone.
                    </p>
                    <div className={styles.confirmActions}>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                      >
                        Cancel
                      </button>
                      <button
                        className={styles.confirmDeleteBtn}
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting…' : 'Yes, delete my account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
