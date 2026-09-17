import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, Search, Filter, Edit2, Trash2, ArrowUpDown } from 'lucide-react'
import { fetchTransactions, deleteTransaction } from '@/services/transactions'
import { fetchCategories } from '@/services/categories'
import { formatCurrency } from '@/lib/formatting/currency'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import TransactionForm from '@/components/forms/TransactionForm'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type { Transaction, TransactionType } from '@/types/database'
import { ArrowLeftRight } from 'lucide-react'

export default function Transactions() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [sortAsc, setSortAsc] = useState(false)

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', { search, typeFilter, categoryFilter, startDate, endDate }],
    queryFn: () => fetchTransactions({
      search: search || undefined,
      type: (typeFilter as TransactionType) || undefined,
      categoryId: categoryFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
  })

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => fetchCategories() })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['budget'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleteTx(null)
    },
  })

  const sorted = [...transactions].sort((a, b) => {
    const cmp = a.transaction_date.localeCompare(b.transaction_date)
    return sortAsc ? cmp : -cmp
  })

  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Transactions</h1>
        <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: transactions.length, suffix: 'transactions', color: 'text-slate-700 dark:text-slate-300' },
          { label: 'Expenses', value: formatCurrency(totalExpenses), color: 'text-red-500' },
          { label: 'Income', value: formatCurrency(totalIncome), color: 'text-emerald-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={cn('font-bold text-lg', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Search description, merchant…"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={cn('btn-secondary flex items-center gap-2', showFilters && 'ring-2 ring-emerald-500')}>
            <Filter size={16} /> Filters
          </button>
          <button onClick={() => setSortAsc(!sortAsc)} className="btn-secondary flex items-center gap-1" title="Sort by date">
            <ArrowUpDown size={16} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TransactionType | '')} className="input">
              <option value="">All types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input">
              <option value="">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" placeholder="From" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" placeholder="To" />
          </div>
        )}
      </div>

      {/* Transactions list */}
      {isLoading ? <LoadingSpinner /> : sorted.length === 0 ? (
        <EmptyState icon={<ArrowLeftRight size={48} />} title="No transactions found" description="Add your first transaction or try different filters." action={<button onClick={() => setAddModal(true)} className="btn-primary">Add Transaction</button>} />
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-700">
          {sorted.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg shrink-0">
                {t.category?.icon ?? '💰'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                  {t.description || t.merchant || t.category?.name || 'Transaction'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {format(new Date(t.transaction_date + 'T00:00:00'), 'MMM d, yyyy')} · {t.category?.name ?? '—'} {t.payment_method && `· ${t.payment_method.replace('_', ' ')}`}
                </p>
              </div>
              <span className={cn('text-sm font-bold shrink-0', t.type === 'expense' ? 'text-red-500' : 'text-emerald-500')}>
                {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
              </span>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditTx(t)} className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20" aria-label="Edit">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => setDeleteTx(t)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Transaction">
        <TransactionForm onSuccess={() => setAddModal(false)} />
      </Modal>

      <Modal open={!!editTx} onClose={() => setEditTx(null)} title="Edit Transaction">
        {editTx && <TransactionForm transaction={editTx} onSuccess={() => setEditTx(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!deleteTx}
        onClose={() => setDeleteTx(null)}
        onConfirm={() => deleteTx && deleteMutation.mutate(deleteTx.id)}
        title="Delete Transaction"
        message={`Delete ${deleteTx?.description || 'this transaction'}? This action cannot be undone.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
