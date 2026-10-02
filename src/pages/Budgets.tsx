import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Wallet, Copy, Edit2 } from 'lucide-react'
import { fetchMonthlyBudget, upsertMonthlyBudget, copyPreviousMonthBudget } from '@/services/budgets'
import { fetchTransactions } from '@/services/transactions'
import { calculateBudget, getMonthDateRange, getMonthStart } from '@/lib/calculations/budget'
import { formatCurrency, formatPercentage } from '@/lib/formatting/currency'
import Modal from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'

const budgetSchema = z.object({ amount: z.coerce.number().positive('Enter a positive amount') })
type BudgetForm = z.infer<typeof budgetSchema>

export default function Budgets() {
  const qc = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [editModal, setEditModal] = useState(false)
  const monthStart = getMonthStart(currentMonth)
  const { start, end } = getMonthDateRange(currentMonth)

  const { data: budget } = useQuery({
    queryKey: ['budget', monthStart],
    queryFn: () => fetchMonthlyBudget(monthStart),
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', 'budget', start, end],
    queryFn: () => fetchTransactions({ startDate: start, endDate: end }),
  })

  const expenses = transactions.filter(t => t.type === 'expense')
  const budgetCalc = calculateBudget(
    budget?.amount ?? 0,
    expenses.map(t => t.amount),
    [],
    currentMonth
  )

  const saveMutation = useMutation({
    mutationFn: ({ amount }: BudgetForm) => upsertMonthlyBudget(amount, monthStart),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget'] }); setEditModal(false) },
  })

  const copyMutation = useMutation({
    mutationFn: copyPreviousMonthBudget,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget'] }),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { amount: budget?.amount ?? 0 },
    values: budget ? { amount: budget.amount } : undefined,
  })

  // Category breakdown
  const catSpend: Record<string, { name: string; amount: number; icon: string }> = {}
  expenses.forEach(t => {
    const key = t.category?.name ?? 'Other'
    if (!catSpend[key]) catSpend[key] = { name: key, amount: 0, icon: t.category?.icon ?? '💰' }
    catSpend[key].amount += t.amount
  })
  const catBreakdown = Object.values(catSpend).sort((a, b) => b.amount - a.amount)

  const isCurrentMonth = monthStart === getMonthStart(new Date())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Budgets</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-secondary p-2"><ChevronLeft size={18} /></button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-secondary p-2"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* Budget overview */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Monthly Budget</h2>
            <p className="text-sm text-slate-400">{format(currentMonth, 'MMMM yyyy')}</p>
          </div>
          <div className="flex gap-2">
            {!budget && (
              <button
                onClick={() => copyMutation.mutate()}
                disabled={copyMutation.isPending}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Copy size={14} /> Copy Previous
              </button>
            )}
            <button onClick={() => setEditModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Edit2 size={14} /> {budget ? 'Edit Budget' : 'Set Budget'}
            </button>
          </div>
        </div>

        {budget ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Monthly Budget', value: formatCurrency(budget.amount), icon: <Wallet size={18} /> },
                { label: 'Spent', value: formatCurrency(budgetCalc.totalExpenses), color: 'text-red-500' },
                { label: 'Remaining', value: budgetCalc.isOverBudget ? `Over ${formatCurrency(Math.abs(budgetCalc.remainingMonthlyBudget))}` : formatCurrency(budgetCalc.remainingMonthlyBudget), color: budgetCalc.isOverBudget ? 'text-red-500' : 'text-emerald-500' },
                { label: 'Daily Allowance', value: formatCurrency(budgetCalc.dynamicDailyAllowance), color: budgetCalc.dynamicDailyAllowance < 0 ? 'text-red-500' : 'text-emerald-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={cn('text-lg font-bold', color ?? 'text-slate-800 dark:text-white')}>{value}</p>
                </div>
              ))}
            </div>

            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Budget used</span>
              <span className={budgetCalc.isOverBudget ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}>
                {formatPercentage(Math.min(budgetCalc.percentageUsed, 100))} {isCurrentMonth && `· ${budgetCalc.remainingDays} days left`}
              </span>
            </div>
            <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', budgetCalc.isOverBudget ? 'bg-red-500' : budgetCalc.percentageUsed > 80 ? 'bg-amber-500' : 'bg-emerald-500')}
                style={{ width: `${Math.min(budgetCalc.percentageUsed, 100)}%` }}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">No budget set for {format(currentMonth, 'MMMM yyyy')}</p>
            <button onClick={() => setEditModal(true)} className="btn-primary">Set Monthly Budget</button>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {catBreakdown.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Spending by Category</h3>
          <div className="space-y-3">
            {catBreakdown.map(cat => {
              const pct = budget ? (cat.amount / budget.amount) * 100 : 0
              return (
                <div key={cat.name}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{cat.icon}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{cat.name}</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-white">{formatCurrency(cat.amount)}</span>
                    {budget && <span className="text-xs text-slate-400 w-12 text-right">{formatPercentage(pct)}</span>}
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Edit budget modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title={budget ? 'Edit Monthly Budget' : 'Set Monthly Budget'} size="sm">
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Budget Amount (₹)</label>
            <input {...register('amount')} type="number" step="any" className="input" placeholder="30000" />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1">
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
