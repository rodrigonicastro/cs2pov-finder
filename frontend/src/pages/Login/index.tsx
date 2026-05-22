import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import RegisterQuestionnaire from './RegisterQuestionnaire'
import MapRoleSelector from './MapRoleSelector'
import { saveSession, getEmail } from '../../utils/auth'
import styles from './Login.module.css'

import { API_BASE as BASE } from '../../config'

type Mode = 'login' | 'register'
type Step = 'email' | 'otp' | 'questionnaire' | 'map-roles'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(value)
}

export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [step, setStep] = useState<Step>('email')

  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [username, setUsername] = useState('')
  const [otp, setOtp] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  if (getEmail()) return <Navigate to="/videos" replace />

  const emailError = emailTouched && email && !isValidEmail(email)
    ? 'Please enter a valid email address.'
    : null

  function switchMode(next: Mode) {
    setMode(next)
    setStep('email')
    setError('')
    setEmailTouched(false)
    setOtp('')
  }

  // ── Login step 1 — request OTP ────────────────────────────────────────────
  async function sendLoginOtp() {
    setEmailTouched(true)
    if (!isValidEmail(email)) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStep('otp')
      } else {
        const data = await res.json()
        setError(data.detail ?? 'Something went wrong.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  // ── Login step 2 — verify OTP ─────────────────────────────────────────────
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      })
      if (res.ok) {
        const data = await res.json()
        saveSession(email, data.username, rememberMe)
        navigate('/videos')
      } else {
        const data = await res.json()
        setError(data.detail ?? 'Something went wrong.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  // ── Register step 1 — request registration OTP ───────────────────────────
  async function sendRegistrationOtp() {
    setEmailTouched(true)
    if (!isValidEmail(email) || !username.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/auth/request-registration-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username }),
      })
      if (res.ok) {
        setStep('otp')
      } else {
        const data = await res.json()
        setError(data.detail ?? 'Something went wrong.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  // ── Register step 2 — verify registration OTP ────────────────────────────
  async function handleVerifyRegistration(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/auth/verify-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, code: otp }),
      })
      if (res.ok) {
        const data = await res.json()
        setUsername(data.username)
        setStep('questionnaire')
      } else {
        const data = await res.json()
        setError(data.detail ?? 'Something went wrong.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  // ── Post-register steps ───────────────────────────────────────────────────
  if (step === 'questionnaire') {
    return <RegisterQuestionnaire email={email} onDone={() => setStep('map-roles')} />
  }
  if (step === 'map-roles') {
    return (
      <MapRoleSelector
        email={email}
        onBack={() => setStep('questionnaire')}
        onDone={() => { saveSession(email, username, false); navigate('/videos') }}
      />
    )
  }

  // ── OTP step (shared between login and register) ──────────────────────────
  if (step === 'otp') {
    const isLogin = mode === 'login'
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>🎯</div>
            <span className={styles.title}>CS2 POV Finder</span>
          </div>

          <form className={styles.form} onSubmit={isLogin ? handleVerifyOtp : handleVerifyRegistration}>
            <p className={styles.hint}>
              Enter the 6-digit code sent to <strong>{email}</strong><br />
              Remember to check your spam folder.
            </p>

            <div className={styles.field}>
              <label htmlFor="otp">Code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
                className={styles.otpInput}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submit} disabled={loading || otp.length !== 6}>
              {loading ? '…' : isLogin ? 'Sign in' : 'Verify email'}
            </button>
          </form>

          <p className={styles.toggle}>
            <button type="button" onClick={() => { setStep('email'); setOtp(''); setError('') }}>
              ← Back
            </button>
            {' · '}
            <button
              type="button"
              disabled={loading}
              onClick={() => isLogin ? sendLoginOtp() : sendRegistrationOtp()}
            >
              Resend code
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ── Email / registration form ─────────────────────────────────────────────
  const isLogin = mode === 'login'
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🎯</div>
          <span className={styles.title}>CS2 POV Finder</span>
        </div>

        <form
          className={styles.form}
          onSubmit={e => { e.preventDefault(); isLogin ? sendLoginOtp() : sendRegistrationOtp() }}
        >
          <p className={styles.hint}>
            {isLogin
              ? "Enter your email and we'll send you a sign-in code."
              : "Create your account. We'll send a verification code to your email."}
          </p>

          {!isLogin && (
            <div className={styles.field}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="your_name"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              required
            />
            {emailError && <p className={styles.error}>{emailError}</p>}
          </div>

          {isLogin && (
            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? '…' : isLogin ? 'Send code' : 'Create account'}
          </button>
        </form>

        <p className={styles.toggle}>
          {isLogin ? (
            <>Don't have an account?{' '}
              <button type="button" onClick={() => switchMode('register')}>Register</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button type="button" onClick={() => switchMode('login')}>Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
