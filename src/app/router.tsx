import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './providers/AuthProvider'
import AppShell from '@/components/layout/AppShell'
import AuthPage from '@/features/auth/AuthPage'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Calendar from '@/pages/Calendar'
import Budgets from '@/pages/Budgets'
import Analytics from '@/pages/Analytics'
import Categories from '@/pages/Categories'
import Savings from '@/pages/Savings'
import Investments from '@/pages/Investments'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import RecurringPage from '@/pages/Recurring'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
  if (!user) return <Navigate to="/auth" replace />
  return <Outlet />
}

function PublicRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <PublicRoute />,
    children: [{ index: true, element: <AuthPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Dashboard /> },
          { path: '/transactions', element: <Transactions /> },
          { path: '/calendar', element: <Calendar /> },
          { path: '/budgets', element: <Budgets /> },
          { path: '/analytics', element: <Analytics /> },
          { path: '/categories', element: <Categories /> },
          { path: '/savings', element: <Savings /> },
          { path: '/investments', element: <Investments /> },
          { path: '/reports', element: <Reports /> },
          { path: '/settings', element: <Settings /> },
          { path: '/recurring', element: <RecurringPage /> },
        ],
      },
    ],
  },
])
