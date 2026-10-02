import { useState } from 'react'
import { toDateKey } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { fetchTransactions } from '@/services/transactions'
import { formatCurrency } from '@/lib/formatting/currency'

type Range = 'today' | 'week' | 'month' | 'last_month' | 'custom'

const COLORS = ['#10b981', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#eab308', '#ef4444', '#64748b']

function getRange(range: Range, customStart: string, customEnd: string): { start: string; end: string } {
  const today = new Date()
  switch (range) {
    case 'today': return { start: toDateKey(today), end: toDateKey(today) }
    case 'week': return { start: toDateKey(startOfWeek(today, { weekStartsOn: 1 })), end: toDateKey(endOfWeek(today, { weekStartsOn: 1 })) }
    case 'month': return { start: toDateKey(startOfMonth(today)), end: toDateKey(endOfMonth(today)) }
    case 'last_month': {
      const lm = subMonths(today, 1)
      return { start: toDateKey(startOfMonth(lm)), end: toDateKey(endOfMonth(lm)) }
    }
    case 'custom': return { start: customStart, end: customEnd }
  }
}

const RANGES: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom' },
]

export default function Analytics() {
  const [range, setRange] = useState<Range>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { start, end } = getRange(range, customStart, customEnd)

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', 'analytics', start, end],
    queryFn: () => fetchTransactions({ startDate: start, endDate: end }),
    enabled: range !== 'custom' || (!!customStart && !!customEnd),
  })

  const expenses = transactions.filter(t => t.type === 'expense')
  const incomes = transactions.filter(t => t.type === 'income')
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0)
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)

  // Category pie
  const catMap: Record<string, { name: string; value: number }> = {}
  expenses.forEach(t => {
    const k = t.category?.name ?? 'Other'
    catMap[k] = { name: k, value: (catMap[k]?.value ?? 0) + t.amount }
  })
  const catData = Object.values(catMap).sort((a, b) => b.value - a.value)

  // Daily bar
  const dailyMap: Record<string, { expense: number; income: number }> = {}
  transactions.forEach(t => {
    if (!dailyMap[t.transaction_date]) dailyMap[t.transaction_date] = { expense: 0, income: 0 }
    dailyMap[t.transaction_date][t.type as 'expense' | 'income'] += t.amount
  })
  const dailyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date: format(new Date(date + 'T00:00:00'), 'MMM d'), ...v }))

  // Monthly comparison (last 6 months)
  const today = new Date()
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(today, 5 - i)
    const ms = toDateKey(startOfMonth(m))
    const me = toDateKey(endOfMonth(m))
    return { month: format(m, 'MMM'), ms, me }
  })

  const { data: allMonthlyTx = [] } = useQuery({
    queryKey: ['transactions', 'monthly-compare'],
    queryFn: () => fetchTransactions({
      startDate: monthlyData[0].ms,
      endDate: monthlyData[monthlyData.length - 1].me,
    }),
  })

  const monthlySeries = monthlyData.map(({ month, ms, me }) => {
    const exp = allMonthlyTx.filter(t => t.type === 'expense' && t.transaction_date >= ms && t.transaction_date <= me).reduce((s, t) => s + t.amount, 0)
    const inc = allMonthlyTx.filter(t => t.type === 'income' && t.transaction_date >= ms && t.transaction_date <= me).reduce((s, t) => s + t.amount, 0)
    return { month, expenses: exp, income: inc }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Analytics</h1>

      {/* Range selector */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${range === r.value ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="flex gap-3">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input" />
            <span className="self-center text-slate-400">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input" />
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Expenses', value: formatCurrency(totalExpenses), color: 'text-red-500' },
          { label: 'Total Income', value: formatCurrency(totalIncome), color: 'text-emerald-500' },
          { label: 'Net', value: formatCurrency(totalIncome - totalExpenses), color: totalIncome >= totalExpenses ? 'text-emerald-500' : 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`font-bold text-lg ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Daily spending */}
      {dailyData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Daily Spending</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
              <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category donut */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Expenses by Category</h3>
          {catData.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No expense data</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={catData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={50} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {catData.slice(0, 5).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="flex-1 text-slate-600 dark:text-slate-400">{c.name}</span>
                    <span className="font-medium">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Monthly trend */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">6-Month Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Expenses" />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Income" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
