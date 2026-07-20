import { useEffect, useState } from 'react'
import UserMenu from '../../components/layout/UserMenu'
import AuthPrompt from '../../components/ui/AuthPrompt'
import SurveyModal from '../../components/ui/SurveyModal'
import AllVideos from './AllVideos'
import MajorVideos from './MajorVideos'
import MyVideos from './MyVideos'
import MyRoles from './MyRoles'
import MyPlayers from './MyPlayers'
import { getEmail } from '../../utils/auth'
import { API_BASE } from '../../config'
import styles from './Videos.module.css'

type Tab = 'my-videos' | 'my-roles' | 'my-players' | 'all-videos' | 'major'

const GATED_TABS: Tab[] = ['my-videos', 'my-roles', 'my-players']

const TABS: { id: Tab; label: string }[] = [
  { id: 'my-videos', label: 'My Videos' },
  { id: 'my-roles', label: 'My Roles' },
  { id: 'my-players', label: 'My Players' },
  { id: 'all-videos', label: 'All Videos' },
]

const SURVEY_SKIP_KEY = 'survey_skip'

export default function Videos() {
  const email = getEmail()
  const isAuthed = !!email
  const [activeTab, setActiveTab] = useState<Tab>(isAuthed ? 'my-videos' : 'all-videos')
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

  function dismissSurvey() {
    sessionStorage.setItem(SURVEY_SKIP_KEY, '1')
    setShowSurvey(false)
  }

  const tabRequiresAuth = GATED_TABS.includes(activeTab) && !isAuthed

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo} role="img" aria-label="CS2 POV Finder" />
          <nav className={styles.nav}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.active : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <button
          className={`${styles.majorButton} ${activeTab === 'major' ? styles.majorButtonActive : ''}`}
          onClick={() => setActiveTab('major')}
        >
          IEM Cologne Major 2026
        </button>
        <UserMenu />
      </header>

      <main className={styles.main}>
        {tabRequiresAuth ? (
          <AuthPrompt feature={TABS.find(t => t.id === activeTab)?.label.toLowerCase() ?? 'this page'} />
        ) : (
          <>
            {activeTab === 'my-videos' && <MyVideos />}
            {activeTab === 'my-roles' && <MyRoles />}
            {activeTab === 'my-players' && <MyPlayers />}
          </>
        )}
        {activeTab === 'all-videos' && <AllVideos />}
        {activeTab === 'major' && <MajorVideos />}
      </main>

      {showSurvey && <SurveyModal email={email} onClose={dismissSurvey} onSubmit={dismissSurvey} />}
    </div>
  )
}
