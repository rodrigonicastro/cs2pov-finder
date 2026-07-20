import { useNavigate } from 'react-router-dom'
import styles from './AuthPrompt.module.css'

export default function AuthPrompt({ feature }: { feature: string }) {
  const navigate = useNavigate()

  return (
    <div className={styles.wrapper}>
      <p className={styles.title}>Log in to see {feature}</p>
      <p className={styles.subtitle}>Create a free account or log in to continue.</p>
      <div className={styles.actions}>
        <button className={styles.loginBtn} onClick={() => navigate('/login')}>Log In</button>
        <button className={styles.registerBtn} onClick={() => navigate('/login?mode=register')}>Create Account</button>
      </div>
    </div>
  )
}
