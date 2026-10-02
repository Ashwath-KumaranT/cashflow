import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Pause, Play, Trash2, AlertCircle } from 'lucide-react'
import { fetchRecurringTransactions, createRecurringTransaction, processRecurringTransactions, toggleRecurringActive, deleteRecurring } from '@/services/recurring'
import { fetchCategories } from '@/services/categories'
import type { RecurringTransaction, TransactionType, RecurringFrequency } from '@/types/database'
import { formatCurrency } from '@/lib/formatting/currency'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { todayISO } from '@/lib/utils'
import { cn } from '@/lib/utils'

const schema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.coerce.number().positive(),
  category_id: z.string().min(1),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  next_run_date: z.string().min(1),
  end_date: z.string().optional(),
  description: z.string().optional(),
  merchant: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const FREQ_LABELS: Record<RecurringFrequency, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }

export default function RecurringPage() {
  const qc = useQueryClient()
  const [addModal, setAddModal] = useState(false)
  const [deleteRec, setDeleteRec] = useState<RecurringTransaction | null>(null)

  const { data: rules = [], isLoading } = useQuery({ queryKey: ['recurring'], queryFn: fetchRecurringTransactions })

  const createMutation = useMutation({
    mutationFn: createRecurringTransaction,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring'] }); setAddModal(false) },
  })

  const processMutation = useMutation({
    mutationFn: processRecurringTransactions,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['recurring'] }) },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleRecurringActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecurring(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring'] }); setDeleteRec(null) },
  })

  const RuleForm = () => {
    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { type: 'expense', frequency: 'monthly', next_run_date: todayISO() },
    })
    const type = watch('type') as TransactionType
    const { data: categories = [] } = useQuery({ queryKey: ['categories', type], queryFn: () => fetchCategories(type) })

    return (
      <form onSubmit={handleSubmit(d => createMutation.mutate({ ...d, end_date: d.end_date || undefined, description: d.description || undefined, merchant: d.merchant || undefined }))} className="space-y-4">
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
          {(['expense', 'income'] as TransactionType[]).map(t => (
            <label key={t} className="flex-1 cursor-pointer">
              <input {...register('type')} type="radio" value={t} className="sr-only" />
              <div className={`text-center py-2 text-sm font-medium rounded-md transition-colors ${watch('type') === t ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'}`}>{t === 'expense' ? '💸 Expense' : '💰 Income'}</div>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Amount (₹)</label><input {...register('amount')} type="number" step="any" className="input" />{errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}</div>
          <div>
            <label className="label">Category</label>
            <select {...register('category_id')} className="input"><option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
            {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Frequency</label>
            <select {...register('frequency')} className="input">
              {(['daily', 'weekly', 'monthly', 'yearly'] as RecurringFrequency[]).map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
            </select>
          </div>
          <div><label className="label">Start Date</label><input {...register('next_run_date')} type="date" className="input" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Description</label><input {...register('description')} className="input" placeholder="Optional" /></div>
          <div><label className="label">End Date</label><input {...register('end_date')} type="date" className="input" /></div>
        </div>
        <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full">{createMutation.isPending ? 'Creating…' : 'Create Rule'}</button>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Recurring Transactions</h1>
        <div className="flex gap-2">
          <button onClick={() => processMutation.mutate()} disabled={processMutation.isPending} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={16} className={processMutation.isPending ? 'animate-spin' : ''} /> Process Due
          </button>
          <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Add Rule</button>
        </div>
      </div>

      {processMutation.isSuccess && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm">
          <AlertCircle size={16} /> Recurring transactions processed successfully.
        </div>
      )}

      {isLoading ? <LoadingSpinner /> : rules.length === 0 ? (
        <EmptyState icon={<RefreshCw size={48} />} title="No recurring rules" description="Set up recurring income or expenses to be automatically created." action={<button onClick={() => setAddModal(true)} className="btn-primary">Add Rule</button>} />
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-700">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center gap-3 p-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', rule.active ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-700')}>
                <RefreshCw size={18} className={rule.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 dark:text-white text-sm">{rule.description || rule.category?.name || 'Recurring'}</p>
                <p className="text-xs text-slate-400">{FREQ_LABELS[rule.frequency]} · Next: {rule.next_run_date} {rule.end_date && `· Until ${rule.end_date}`}</p>
              </div>
              <span className={cn('font-bold text-sm', rule.type === 'expense' ? 'text-red-500' : 'text-emerald-500')}>
                {rule.type === 'expense' ? '-' : '+'}{formatCurrency(rule.amount)}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleMutation.mutate({ id: rule.id, active: !rule.active })}
                  className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg"
                  aria-label={rule.active ? 'Pause' : 'Resume'}
                >
                  {rule.active ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button onClick={() => setDeleteRec(rule)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg" aria-label="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={addModal} onClose={() => setAddModal(false)} title="New Recurring Rule"><RuleForm /></Modal>
      <ConfirmDialog open={!!deleteRec} onClose={() => setDeleteRec(null)} onConfirm={() => deleteRec && deleteMutation.mutate(deleteRec.id)} title="Delete Rule" message={`Delete this recurring rule? Past transactions are preserved.`} loading={deleteMutation.isPending} />
    </div>
  )
}
