const EMAIL_KEY = 'user_email'
const USERNAME_KEY = 'username'
const REMEMBER_KEY = 'remember_me'

function isRemembered(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === '1'
}

function activeStore(): Storage {
  return isRemembered() ? localStorage : sessionStorage
}

export function saveSession(email: string, username: string, remember: boolean): void {
  const store = remember ? localStorage : sessionStorage
  store.setItem(EMAIL_KEY, email)
  store.setItem(USERNAME_KEY, username)
  if (remember) localStorage.setItem(REMEMBER_KEY, '1')
}

export function updateSession(email: string, username: string): void {
  const store = activeStore()
  store.setItem(EMAIL_KEY, email)
  store.setItem(USERNAME_KEY, username)
}

export function getEmail(): string {
  return activeStore().getItem(EMAIL_KEY) ?? ''
}

export function getUsername(): string {
  return activeStore().getItem(USERNAME_KEY) ?? ''
}

export function clearSession(): void {
  ;[localStorage, sessionStorage].forEach(s => {
    s.removeItem(EMAIL_KEY)
    s.removeItem(USERNAME_KEY)
    s.removeItem(REMEMBER_KEY)
  })
}
