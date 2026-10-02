import { useState } from 'react'
import { toDateKey } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Download } from 'lucide-react'
import { fetchTransactions } from '@/services/transactions'
import { fetchMonthlyBudget } from '@/services/budgets'
import { fetchSavingsGoals } from '@/services/savings'
import { fetchInvestments, calculateReturn } from '@/services/investments'
import { formatCurrency, formatPercentage } from '@/lib/formatting/currency'
import { getMonthStart } from '@/lib/calculations/budget'

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const monthStart = getMonthStart(selectedMonth)
  const { start, end } = { start: toDateKey(startOfMonth(selectedMonth)), end: toDateKey(endOfMonth(selectedMonth)) }

  const { data: transactions = [] } = useQuery({ queryKey: ['transactions', 'report', start, end], queryFn: () => fetchTransactions({ startDate: start, endDate: end }) })
  const { data: budget } = useQuery({ queryKey: ['budget', monthStart], queryFn: () => fetchMonthlyBudget(monthStart) })
  const { data: goals = [] } = useQuery({ queryKey: ['savings-goals'], queryFn: fetchSavingsGoals })
  const { data: investments = [] } = useQuery({ queryKey: ['investments'], queryFn: fetchInvestments })

  const expenses = transactions.filter(t => t.type === 'expense')
  const incomes = transactions.filter(t => t.type === 'income')
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0)
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)
  const net = totalIncome - totalExpenses

  const catBreakdown: Record<string, number> = {}
  expenses.forEach(t => { catBreakdown[t.category?.name ?? 'Other'] = (catBreakdown[t.category?.name ?? 'Other'] ?? 0) + t.amount })

  const totalInvested = investments.reduce((s, i) => s + i.invested_amount, 0)
  const totalCurrentValue = investments.reduce((s, i) => s + i.current_value, 0)
  const { profitLoss, returnPct } = calculateReturn(totalInvested, totalCurrentValue)

  const exportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method'],
      ...transactions.map(t => [t.transaction_date, t.type, t.category?.name ?? '', t.description ?? '', t.amount, t.payment_method ?? '']),
    ]
    const csv = rows.map(r => r.map(String).map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cashflow-${format(selectedMonth, 'yyyy-MM')}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reports</h1>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={format(selectedMonth, 'yyyy-MM')}
            onChange={e => setSelectedMonth(new Date(e.target.value + '-01T00:00:00'))}
            className="input w-auto"
          />
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Income', value: formatCurrency(totalIncome), color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Total Expenses', value: formatCurrency(totalExpenses), color: 'text-red-500' },
          { label: 'Net Savings', value: formatCurrency(net), color: net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500' },
          { label: 'Budget Used', value: budget ? formatPercentage((totalExpenses / budget.amount) * 100) : 'No budget', color: 'text-slate-700 dark:text-slate-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Monthly expense report */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Expense by Category — {format(selectedMonth, 'MMMM yyyy')}</h2>
        {Object.keys(catBreakdown).length === 0 ? (
          <p className="text-slate-400 text-sm">No expenses this month</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700"><th className="pb-2">Category</th><th className="pb-2 text-right">Amount</th><th className="pb-2 text-right">% of Budget</th></tr></thead>
            <tbody>
              {Object.entries(catBreakdown).sort(([,a],[,b]) => b-a).map(([cat, amount]) => (
                <tr key={cat} className="border-b border-slate-50 dark:border-slate-800">
                  <td className="py-2 text-slate-700 dark:text-slate-300">{cat}</td>
                  <td className="py-2 text-right font-medium text-red-500">{formatCurrency(amount)}</td>
                  <td className="py-2 text-right text-slate-400">{budget ? formatPercentage((amount / budget.amount) * 100) : '—'}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 text-slate-800 dark:text-white">Total</td>
                <td className="py-2 text-right text-red-500">{formatCurrency(totalExpenses)}</td>
                <td className="py-2 text-right text-slate-500">{budget ? formatPercentage((totalExpenses / budget.amount) * 100) : '—'}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Investment report */}
      {investments.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Investment Report</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Invested', value: formatCurrency(totalInvested) },
              { label: 'Current Value', value: formatCurrency(totalCurrentValue) },
              { label: 'P&L', value: formatCurrency(profitLoss), color: profitLoss >= 0 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Return', value: formatPercentage(returnPct), color: returnPct >= 0 ? 'text-emerald-500' : 'text-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                <p className={`font-bold ${color ?? 'text-slate-800 dark:text-white'}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Savings report */}
      {goals.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Savings Goals Report</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700"><th className="pb-2">Goal</th><th className="pb-2 text-right">Saved</th><th className="pb-2 text-right">Target</th><th className="pb-2 text-right">Progress</th></tr></thead>
            <tbody>
              {goals.map(g => (
                <tr key={g.id} className="border-b border-slate-50 dark:border-slate-800">
                  <td className="py-2 text-slate-700 dark:text-slate-300">{g.icon} {g.name}</td>
                  <td className="py-2 text-right font-medium text-emerald-500">{formatCurrency(g.current_amount)}</td>
                  <td className="py-2 text-right text-slate-500">{formatCurrency(g.target_amount)}</td>
                  <td className="py-2 text-right text-slate-400">{formatPercentage(g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
