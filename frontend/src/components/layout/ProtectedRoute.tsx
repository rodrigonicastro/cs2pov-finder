import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { getEmail } from '../../utils/auth'
import { API_BASE } from '../../config'
import SurveyModal from '../ui/SurveyModal'

const SURVEY_SKIP_KEY = 'survey_skip'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const email = getEmail()
  const [showSurvey, setShowSurvey] = useState(false)

  useEffect(() => {
    if (!email || sessionStorage.getItem(SURVEY_SKIP_KEY)) return
    let cancelled = false
    fetch(`${API_BASE}/api/survey/status?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.answered) sessionStorage.setItem(SURVEY_SKIP_KEY, '1')
        else setShowSurvey(true)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [email])

  if (!email) return <Navigate to="/login" replace />

  function dismiss() {
    sessionStorage.setItem(SURVEY_SKIP_KEY, '1')
    setShowSurvey(false)
  }

  return (
    <>
      {children}
      {showSurvey && <SurveyModal email={email} onClose={dismiss} onSubmit={dismiss} />}
    </>
  )
}
