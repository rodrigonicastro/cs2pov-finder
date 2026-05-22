import { Navigate } from 'react-router-dom'
import { getEmail } from '../../utils/auth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!getEmail()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
