import { NavLink } from 'react-router-dom'
import {
  TrendingUp, LayoutDashboard, ArrowLeftRight, CalendarDays, Wallet,
  BarChart3, Tag, PiggyBank, LineChart, FileText, Settings, RefreshCw, LogOut
} from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/budgets', icon: Wallet, label: 'Budgets' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/savings', icon: PiggyBank, label: 'Goals & Savings' },
  { to: '/investments', icon: LineChart, label: 'Investments' },
  { to: '/recurring', icon: RefreshCw, label: 'Recurring' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { signOut, user } = useAuth()

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-200 dark:border-slate-700">
        <div className="bg-emerald-500 text-white p-1.5 rounded-lg">
          <TrendingUp size={20} />
        </div>
        <span className="text-xl font-bold text-slate-800 dark:text-white">CashFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Sign out */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
            {(user?.email ?? 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-800 dark:text-white truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
