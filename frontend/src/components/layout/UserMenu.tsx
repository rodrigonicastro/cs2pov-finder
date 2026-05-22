import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsername, clearSession } from '../../utils/auth'
import styles from './UserMenu.module.css'

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const username = getUsername() || 'Account'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function logout() {
    clearSession()
    navigate('/login')
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <span className={styles.reportHint}>
        Report any issues and bugs like missing and/or incorrect players, maps, roles to{' '}
        <a href="mailto:cs2povfinder@gmail.com" className={styles.reportLink}>
          cs2povfinder@gmail.com
        </a>
      </span>
      <button className={styles.trigger} onClick={() => setOpen(o => !o)}>
        <span className={styles.avatar}>{username[0].toUpperCase()}</span>
        <span className={styles.name}>{username}</span>
        <span className={`${styles.chevron} ${open ? styles.open : ''}`}>▾</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <button className={styles.item} onClick={() => { setOpen(false); navigate('/account') }}>My Account</button>
          <button className={styles.item} onClick={() => { setOpen(false); navigate('/preferences') }}>Preferences</button>
          <div className={styles.divider} />
          <button className={`${styles.item} ${styles.logout}`} onClick={logout}>Log out</button>
        </div>
      )}
    </div>
  )
}
