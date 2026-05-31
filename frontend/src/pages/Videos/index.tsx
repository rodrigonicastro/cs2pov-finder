import { useState } from 'react'
import UserMenu from '../../components/layout/UserMenu'
import AllVideos from './AllVideos'
import MyVideos from './MyVideos'
import MyRoles from './MyRoles'
import MyPlayers from './MyPlayers'
import styles from './Videos.module.css'

type Tab = 'my-videos' | 'my-roles' | 'my-players' | 'all-videos'

const TABS: { id: Tab; label: string }[] = [
  { id: 'my-videos', label: 'My Videos' },
  { id: 'my-roles', label: 'My Roles' },
  { id: 'my-players', label: 'My Players' },
  { id: 'all-videos', label: 'All Videos' },
]

export default function Videos() {
  const [activeTab, setActiveTab] = useState<Tab>('my-videos')

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src="/no_bg_icon.png" alt="CS2 POV Finder" className={styles.logo} />
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
        <UserMenu />
      </header>

      <main className={styles.main}>
        {activeTab === 'my-videos' && <MyVideos />}
        {activeTab === 'my-roles' && <MyRoles />}
        {activeTab === 'my-players' && <MyPlayers />}
        {activeTab === 'all-videos' && <AllVideos />}
      </main>
    </div>
  )
}
