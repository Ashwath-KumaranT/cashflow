import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, LineChart, Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { fetchInvestments, createInvestment, updateInvestment, deleteInvestment, calculateReturn } from '@/services/investments'
import type { Investment, InvestmentType } from '@/types/database'
import { formatCurrency, formatPercentage } from '@/lib/formatting/currency'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { todayISO } from '@/lib/utils'
import { cn } from '@/lib/utils'

const TYPES: { value: InvestmentType; label: string }[] = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'mutual_funds', label: 'Mutual Funds' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'bonds', label: 'Bonds' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'fixed_deposit', label: 'Fixed Deposit' },
  { value: 'other', label: 'Other' },
]

const schema = z.object({
  name: z.string().min(1),
  investment_type: z.enum(['stocks', 'mutual_funds', 'crypto', 'bonds', 'real_estate', 'fixed_deposit', 'other']),
  invested_amount: z.coerce.number().positive(),
  current_value: z.coerce.number().min(0),
  purchase_date: z.string().min(1),
  note: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function InvestmentForm({ initial, onSubmit, loading }: { initial?: Investment; onSubmit: (d: FormData) => void; loading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initial ? {
      name: initial.name, investment_type: initial.investment_type,
      invested_amount: initial.invested_amount, current_value: initial.current_value,
      purchase_date: initial.purchase_date, note: initial.note ?? '',
    } : { purchase_date: todayISO(), investment_type: 'stocks' },
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div><label className="label">Name</label><input {...register('name')} className="input" placeholder="e.g. HDFC Bank Stocks" />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select {...register('investment_type')} className="input">
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div><label className="label">Purchase Date</label><input {...register('purchase_date')} type="date" className="input" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Invested Amount (₹)</label><input {...register('invested_amount')} type="number" step="0.01" className="input" />{errors.invested_amount && <p className="text-xs text-red-500 mt-1">{errors.invested_amount.message}</p>}</div>
        <div><label className="label">Current Value (₹)</label><input {...register('current_value')} type="number" step="0.01" className="input" /></div>
      </div>
      <div><label className="label">Notes</label><input {...register('note')} className="input" placeholder="Optional notes" /></div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving…' : initial ? 'Update' : 'Add Investment'}</button>
    </form>
  )
}

export default function Investments() {
  const qc = useQueryClient()
  const [addModal, setAddModal] = useState(false)
  const [editInv, setEditInv] = useState<Investment | null>(null)
  const [deleteInv, setDeleteInv] = useState<Investment | null>(null)

  const { data: investments = [], isLoading } = useQuery({ queryKey: ['investments'], queryFn: fetchInvestments })

  const createMutation = useMutation({
    mutationFn: createInvestment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investments'] }); setAddModal(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & FormData) => updateInvestment(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investments'] }); setEditInv(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInvestment(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investments'] }); setDeleteInv(null) },
  })

  const totalInvested = investments.reduce((s, i) => s + i.invested_amount, 0)
  const totalCurrent = investments.reduce((s, i) => s + i.current_value, 0)
  const { profitLoss, returnPct } = calculateReturn(totalInvested, totalCurrent)

  // Group by type
  const byType: Record<string, Investment[]> = {}
  investments.forEach(inv => {
    if (!byType[inv.investment_type]) byType[inv.investment_type] = []
    byType[inv.investment_type].push(inv)
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Investments</h1>
        <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Add Investment</button>
      </div>

      {/* Portfolio summary */}
      <div className="card p-5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
        <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">Portfolio Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Invested', value: formatCurrency(totalInvested) },
            { label: 'Current Value', value: formatCurrency(totalCurrent), color: 'text-purple-600 dark:text-purple-400' },
            { label: 'Profit / Loss', value: formatCurrency(profitLoss), color: profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500' },
            { label: 'Return', value: formatPercentage(returnPct), color: returnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className={cn('text-lg font-bold', color ?? 'text-slate-800 dark:text-white')}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {investments.length === 0 ? (
        <EmptyState icon={<LineChart size={48} />} title="No investments yet" description="Track your stocks, mutual funds, crypto and more." action={<button onClick={() => setAddModal(true)} className="btn-primary">Add Investment</button>} />
      ) : (
        Object.entries(byType).map(([type, invs]) => (
          <div key={type}>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              {TYPES.find(t => t.value === type)?.label ?? type}
            </h3>
            <div className="card divide-y divide-slate-100 dark:divide-slate-700">
              {invs.map(inv => {
                const { profitLoss: pl, returnPct: rp } = calculateReturn(inv.invested_amount, inv.current_value)
                const isProfit = pl >= 0
                return (
                  <div key={inv.id} className="flex items-center gap-3 p-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', isProfit ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                      {isProfit ? <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" /> : <TrendingDown size={18} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 dark:text-white text-sm truncate">{inv.name}</p>
                      <p className="text-xs text-slate-400">Invested: {formatCurrency(inv.invested_amount)} · {inv.purchase_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800 dark:text-white">{formatCurrency(inv.current_value)}</p>
                      <p className={cn('text-xs font-medium', isProfit ? 'text-emerald-500' : 'text-red-500')}>
                        {isProfit ? '+' : ''}{formatCurrency(pl)} ({formatPercentage(rp)})
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditInv(inv)} className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg" aria-label="Edit"><Edit2 size={15} /></button>
                      <button onClick={() => setDeleteInv(inv)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg" aria-label="Delete"><Trash2 size={15} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Investment">
        <InvestmentForm onSubmit={d => createMutation.mutate(d)} loading={createMutation.isPending} />
      </Modal>
      <Modal open={!!editInv} onClose={() => setEditInv(null)} title="Edit Investment">
        {editInv && <InvestmentForm initial={editInv} onSubmit={d => updateMutation.mutate({ id: editInv.id, ...d })} loading={updateMutation.isPending} />}
      </Modal>
      <ConfirmDialog open={!!deleteInv} onClose={() => setDeleteInv(null)} onConfirm={() => deleteInv && deleteMutation.mutate(deleteInv.id)} title="Delete Investment" message={`Delete "${deleteInv?.name}"?`} loading={deleteMutation.isPending} />
    </div>
  )
}
