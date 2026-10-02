import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, Wallet, TrendingDown, TrendingUp, PiggyBank, LineChart, Target, AlertTriangle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { fetchTransactions } from '@/services/transactions'
import { fetchMonthlyBudget } from '@/services/budgets'
import { fetchSavingsGoals, fetchSavingsAccounts } from '@/services/savings'
import { fetchInvestments } from '@/services/investments'
import { calculateBudget, getMonthDateRange } from '@/lib/calculations/budget'
import { formatCurrency, formatPercentage } from '@/lib/formatting/currency'
import { useAuth } from '@/app/providers/AuthProvider'
import { useProfile } from '@/hooks/useProfile'
import StatCard from '@/components/ui/StatCard'
import Modal from '@/components/ui/Modal'
import TransactionForm from '@/components/forms/TransactionForm'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { cn, toDateKey } from '@/lib/utils'
import type { TransactionType } from '@/types/database'

const CHART_COLORS = ['#10b981', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#eab308', '#ef4444', '#64748b']
const today = new Date()
const todayISO = toDateKey(today)

export default function Dashboard() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const [addModal, setAddModal] = useState<TransactionType | null>(null)
  const { start, end } = getMonthDateRange(today)

  const { data: monthTransactions, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', 'month', start, end],
    queryFn: () => fetchTransactions({ startDate: start, endDate: end }),
  })

  const { data: budget } = useQuery({
    queryKey: ['budget', start],
    queryFn: () => fetchMonthlyBudget(),
  })

  const { data: goals = [] } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: fetchSavingsGoals,
  })

  const { data: savingsAccounts = [] } = useQuery({
    queryKey: ['savings-accounts'],
    queryFn: fetchSavingsAccounts,
  })

  const { data: investments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: fetchInvestments,
  })

  const expenses = (monthTransactions ?? []).filter(t => t.type === 'expense')
  const todayExpenses = expenses.filter(t => t.transaction_date === todayISO)

  const budgetCalc = calculateBudget(
    budget?.amount ?? 0,
    expenses.map(t => t.amount),
    todayExpenses.map(t => t.amount),
    today
  )

  const totalSavings = savingsAccounts.reduce((s, a) => s + a.balance, 0)
    + goals.reduce((s, g) => s + g.current_amount, 0)
  const totalInvestments = investments.reduce((s, i) => s + i.current_value, 0)

  // Chart: daily spending this month
  const dailySpendMap: Record<string, number> = {}
  expenses.forEach(t => {
    dailySpendMap[t.transaction_date] = (dailySpendMap[t.transaction_date] ?? 0) + t.amount
  })
  const dailyChartData = Array.from({ length: today.getDate() }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), i + 1)
    const dateStr = toDateKey(d)
    return {
      day: format(d, 'd'),
      spent: dailySpendMap[dateStr] ?? 0,
      allowance: budgetCalc.dynamicDailyAllowance > 0 ? budgetCalc.dynamicDailyAllowance : 0,
    }
  })

  // Category donut
  const categoryMap: Record<string, { name: string; amount: number; color: string }> = {}
  expenses.forEach(t => {
    const key = t.category?.name ?? 'Other'
    if (!categoryMap[key]) categoryMap[key] = { name: key, amount: 0, color: t.category?.color ?? '#94a3b8' }
    categoryMap[key].amount += t.amount
  })
  const categoryData = Object.values(categoryMap).sort((a, b) => b.amount - a.amount).slice(0, 6)

  const recentTransactions = [...(monthTransactions ?? [])].slice(0, 5)

  if (txLoading) return <LoadingSpinner />

  const budgetVariant = budgetCalc.isOverBudget ? 'negative' : budgetCalc.percentageUsed > 80 ? 'warning' : 'positive'
  const userName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'there'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Hi, {userName}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button onClick={() => setAddModal('expense')} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Expense
        </button>
      </div>

      {/* Over budget alert */}
      {budgetCalc.isOverBudget && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle className="text-red-500 shrink-0" size={20} />
          <div>
            <p className="font-medium text-red-700 dark:text-red-400">Over Budget</p>
            <p className="text-sm text-red-600 dark:text-red-400">
              You've exceeded your monthly budget by {formatCurrency(Math.abs(budgetCalc.remainingMonthlyBudget))}
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Today's Spend"
          value={formatCurrency(budgetCalc.todaySpent)}
          subtitle={`Daily allowance: ${formatCurrency(budgetCalc.dynamicDailyAllowance)}`}
          icon={<TrendingDown size={20} />}
          variant={budgetCalc.todaySpent > budgetCalc.dynamicDailyAllowance && budgetCalc.dynamicDailyAllowance > 0 ? 'negative' : 'default'}
        />
        <StatCard
          title="Today's Dynamic Allowance"
          value={formatCurrency(budgetCalc.dynamicDailyAllowance)}
          subtitle={`${budgetCalc.remainingDays} days remaining`}
          icon={<Wallet size={20} />}
          variant={budgetCalc.dynamicDailyAllowance < 0 ? 'negative' : 'positive'}
        />
        <StatCard
          title="Monthly Spend"
          value={formatCurrency(budgetCalc.totalExpenses)}
          subtitle={`Budget: ${formatCurrency(budgetCalc.monthlyBudget)}`}
          icon={<TrendingDown size={20} />}
        />
        <StatCard
          title="Remaining Monthly Budget"
          value={budgetCalc.isOverBudget ? `Over by ${formatCurrency(Math.abs(budgetCalc.remainingMonthlyBudget))}` : formatCurrency(budgetCalc.remainingMonthlyBudget)}
          subtitle={`${formatPercentage(Math.min(budgetCalc.percentageUsed, 100))} used`}
          icon={<Wallet size={20} />}
          variant={budgetVariant}
        />
        <StatCard
          title="Total Savings"
          value={formatCurrency(totalSavings)}
          subtitle="Goals + accounts"
          icon={<PiggyBank size={20} />}
          variant="positive"
        />
        <StatCard
          title="Investments"
          value={formatCurrency(totalInvestments)}
          subtitle="Portfolio value"
          icon={<LineChart size={20} />}
          variant="positive"
        />
      </div>

      {/* Budget progress bar */}
      {budget && (
        <div className="card p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">Monthly Budget Progress</span>
            <span className={cn(budgetCalc.isOverBudget ? 'text-red-500' : 'text-slate-600 dark:text-slate-400')}>
              {formatPercentage(Math.min(budgetCalc.percentageUsed, 100))}
            </span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', budgetCalc.isOverBudget ? 'bg-red-500' : budgetCalc.percentageUsed > 80 ? 'bg-amber-500' : 'bg-emerald-500')}
              style={{ width: `${Math.min(budgetCalc.percentageUsed, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Spent: {formatCurrency(budgetCalc.totalExpenses)}</span>
            <span>Budget: {formatCurrency(budgetCalc.monthlyBudget)}</span>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily spending chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Daily Expenses This Month</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="spent" stroke="#10b981" fill="#d1fae5" name="Spent" />
              <Area type="monotone" dataKey="allowance" stroke="#94a3b8" fill="none" strokeDasharray="4 2" name="Allowance" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category donut */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Expenses by Category</h3>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">No expenses yet</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={categoryData} dataKey="amount" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate text-slate-600 dark:text-slate-400">{c.name}</span>
                    <span className="ml-auto font-medium text-slate-800 dark:text-white">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions + Goals preview */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent transactions */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Recent Transactions</h3>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map(t => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm">
                    {t.category?.icon ?? '💰'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                      {t.description || t.merchant || t.category?.name || 'Transaction'}
                    </p>
                    <p className="text-xs text-slate-400">{t.transaction_date} · {t.category?.name}</p>
                  </div>
                  <span className={cn('text-sm font-semibold', t.type === 'expense' ? 'text-red-500' : 'text-emerald-500')}>
                    {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Savings Goals preview */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Savings Goals</h3>
          {goals.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No goals set yet</p>
          ) : (
            <div className="space-y-4">
              {goals.slice(0, 3).map(goal => {
                const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0
                return (
                  <div key={goal.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{goal.icon}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">{goal.name}</span>
                      <span className="text-xs text-slate-400">{formatPercentage(pct)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>{formatCurrency(goal.current_amount)}</span>
                      <span>{formatCurrency(goal.target_amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Add Expense', icon: TrendingDown, action: () => setAddModal('expense'), color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
            { label: 'Add Income', icon: TrendingUp, action: () => setAddModal('income'), color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Add Saving', icon: PiggyBank, action: () => window.location.assign('/savings'), color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Investments', icon: Target, action: () => window.location.assign('/investments'), color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
          ].map(({ label, icon: Icon, action, color }) => (
            <button
              key={label}
              onClick={action}
              className={cn('flex flex-col items-center gap-2 p-4 rounded-xl transition-colors hover:opacity-80', color)}
            >
              <Icon size={24} />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Add transaction modal */}
      <Modal open={addModal !== null} onClose={() => setAddModal(null)} title={addModal === 'expense' ? 'Add Expense' : 'Add Income'}>
        {addModal && <TransactionForm defaultType={addModal} onSuccess={() => setAddModal(null)} />}
      </Modal>
    </div>
  )
}
