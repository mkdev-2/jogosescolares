import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AppLayout from './layout/AppLayout'
import PageTransition from './ui/PageTransition'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc] text-[#64748b]">
        <div className="w-10 h-10 border-[3px] border-[#e2e8f0] border-t-[#0f766e] rounded-full animate-spin" />
        <p>Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <AppLayout>
      <PageTransition key={location.pathname}>
        <Outlet />
      </PageTransition>
    </AppLayout>
  )
}
