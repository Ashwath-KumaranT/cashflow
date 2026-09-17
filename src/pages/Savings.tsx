import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, PiggyBank, Target, Edit2 } from 'lucide-react'
import { fetchSavingsGoals, createSavingsGoal, addContribution, fetchSavingsAccounts, createSavingsAccount, updateSavingsAccount } from '@/services/savings'
import { formatCurrency, formatPercentage } from '@/lib/formatting/currency'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { todayISO } from '@/lib/utils'
import type { SavingsAccount } from '@/types/database'

const goalSchema = z.object({
  name: z.string().min(1),
  target_amount: z.coerce.number().positive(),
  target_date: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

const contribSchema = z.object({
  goal_id: z.string().nullable(),
  amount: z.coerce.number().positive(),
  contribution_date: z.string().min(1),
  note: z.string().optional(),
})

const accountSchema = z.object({
  name: z.string().min(1),
  balance: z.coerce.number().min(0),
  institution: z.string().optional(),
  note: z.string().optional(),
})

export default function Savings() {
  const qc = useQueryClient()
  const [addGoalModal, setAddGoalModal] = useState(false)
  const [addContribModal, setAddContribModal] = useState<string | null>(null) // goal id
  const [addAccountModal, setAddAccountModal] = useState(false)
  const [editAccount, setEditAccount] = useState<SavingsAccount | null>(null)

  const { data: goals = [], isLoading: goalsLoading } = useQuery({ queryKey: ['savings-goals'], queryFn: fetchSavingsGoals })
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({ queryKey: ['savings-accounts'], queryFn: fetchSavingsAccounts })

  const createGoalMutation = useMutation({
    mutationFn: createSavingsGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['savings-goals'] }); setAddGoalModal(false) },
  })

  const contribMutation = useMutation({
    mutationFn: addContribution,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['savings-goals'] }); setAddContribModal(null) },
  })

  const createAccountMutation = useMutation({
    mutationFn: createSavingsAccount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['savings-accounts'] }); setAddAccountModal(false) },
  })

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; balance: number; name: string; institution?: string; note?: string }) =>
      updateSavingsAccount(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['savings-accounts'] }); setEditAccount(null) },
  })

  const totalGoalSavings = goals.reduce((s, g) => s + g.current_amount, 0)
  const totalAccountSavings = accounts.reduce((s, a) => s + a.balance, 0)
  const totalSavings = totalGoalSavings + totalAccountSavings

  const GoalForm = () => {
    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(goalSchema) })
    return (
      <form onSubmit={handleSubmit(d => createGoalMutation.mutate({ ...d, target_date: d.target_date || undefined }))} className="space-y-4">
        <div><label className="label">Goal Name</label><input {...register('name')} className="input" placeholder="Emergency Fund" />{errors.name && <p className="text-xs text-red-500 mt-1">{String(errors.name.message)}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Target Amount (₹)</label><input {...register('target_amount')} type="number" className="input" />{errors.target_amount && <p className="text-xs text-red-500 mt-1">{String(errors.target_amount.message)}</p>}</div>
          <div><label className="label">Target Date</label><input {...register('target_date')} type="date" className="input" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Icon</label><input {...register('icon')} className="input" placeholder="🎯" /></div>
          <div><label className="label">Color</label><input {...register('color')} type="color" className="input h-10" defaultValue="#10b981" /></div>
        </div>
        <button type="submit" disabled={createGoalMutation.isPending} className="btn-primary w-full">{createGoalMutation.isPending ? 'Creating…' : 'Create Goal'}</button>
      </form>
    )
  }

  const ContribForm = ({ goalId }: { goalId: string | null }) => {
    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(contribSchema), defaultValues: { goal_id: goalId, contribution_date: todayISO() } })
    return (
      <form onSubmit={handleSubmit(d => contribMutation.mutate({ ...d, goal_id: d.goal_id || null, note: d.note || undefined }))} className="space-y-4">
        <div><label className="label">Amount (₹)</label><input {...register('amount')} type="number" className="input" />{errors.amount && <p className="text-xs text-red-500 mt-1">{String(errors.amount.message)}</p>}</div>
        <div><label className="label">Date</label><input {...register('contribution_date')} type="date" className="input" /></div>
        <div><label className="label">Note</label><input {...register('note')} className="input" placeholder="Optional note" /></div>
        <button type="submit" disabled={contribMutation.isPending} className="btn-primary w-full">{contribMutation.isPending ? 'Adding…' : 'Add Contribution'}</button>
      </form>
    )
  }

  const AccountForm = ({ initial }: { initial?: SavingsAccount }) => {
    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(accountSchema), defaultValues: initial ? { name: initial.name, balance: initial.balance, institution: initial.institution ?? '', note: initial.note ?? '' } : {} })
    return (
      <form onSubmit={handleSubmit(d => {
        if (initial) updateAccountMutation.mutate({ id: initial.id, ...d, balance: Number(d.balance) })
        else createAccountMutation.mutate({ ...d, balance: Number(d.balance) })
      })} className="space-y-4">
        <div><label className="label">Account Name</label><input {...register('name')} className="input" placeholder="HDFC Savings" />{errors.name && <p className="text-xs text-red-500 mt-1">{String(errors.name.message)}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Balance (₹)</label><input {...register('balance')} type="number" step="0.01" className="input" /></div>
          <div><label className="label">Institution</label><input {...register('institution')} className="input" placeholder="HDFC Bank" /></div>
        </div>
        <div><label className="label">Note</label><input {...register('note')} className="input" /></div>
        <button type="submit" disabled={createAccountMutation.isPending || updateAccountMutation.isPending} className="btn-primary w-full">
          {initial ? 'Update Account' : 'Add Account'}
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Goals & Savings</h1>
        <div className="flex gap-2">
          <button onClick={() => setAddAccountModal(true)} className="btn-secondary flex items-center gap-2 text-sm"><PiggyBank size={16} /> Add Account</button>
          <button onClick={() => setAddGoalModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> New Goal</button>
        </div>
      </div>

      {/* Total */}
      <div className="card p-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Savings</p>
        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalSavings)}</p>
        <p className="text-xs text-slate-400 mt-1">Goals: {formatCurrency(totalGoalSavings)} · Accounts: {formatCurrency(totalAccountSavings)}</p>
      </div>

      {/* Goals */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Savings Goals</h2>
        {goalsLoading ? <LoadingSpinner /> : goals.length === 0 ? (
          <div className="card p-8 text-center">
            <Target className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
            <p className="text-slate-400">No savings goals yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {goals.map(goal => {
              const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0
              return (
                <div key={goal.id} className="card p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{goal.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 dark:text-white">{goal.name}</h3>
                      {goal.target_date && <p className="text-xs text-slate-400">Target: {goal.target_date}</p>}
                    </div>
                    <button onClick={() => setAddContribModal(goal.id)} className="btn-primary text-xs px-2 py-1">+ Add</button>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{formatCurrency(goal.current_amount)}</span>
                      <span>{formatPercentage(pct)} · {formatCurrency(goal.target_amount)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Accounts */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Savings Accounts</h2>
        {accountsLoading ? <LoadingSpinner /> : accounts.length === 0 ? (
          <p className="text-slate-400 text-sm">No savings accounts added yet</p>
        ) : (
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <PiggyBank size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-white text-sm">{acc.name}</p>
                  {acc.institution && <p className="text-xs text-slate-400">{acc.institution}</p>}
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(acc.balance)}</span>
                <button onClick={() => setEditAccount(acc)} className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg"><Edit2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={addGoalModal} onClose={() => setAddGoalModal(false)} title="New Savings Goal"><GoalForm /></Modal>
      <Modal open={addContribModal !== null} onClose={() => setAddContribModal(null)} title="Add Contribution" size="sm">
        <ContribForm goalId={addContribModal} />
      </Modal>
      <Modal open={addAccountModal} onClose={() => setAddAccountModal(false)} title="Add Savings Account" size="sm"><AccountForm /></Modal>
      <Modal open={!!editAccount} onClose={() => setEditAccount(null)} title="Edit Savings Account" size="sm">
        {editAccount && <AccountForm initial={editAccount} />}
      </Modal>
    </div>
  )
}
