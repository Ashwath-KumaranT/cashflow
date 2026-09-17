import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCategories } from '@/services/categories'
import { createTransaction, updateTransaction } from '@/services/transactions'
import type { Transaction, TransactionType, PaymentMethod } from '@/types/database'
import { todayISO, nowTime } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

const schema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.coerce.number().positive('Amount must be positive'),
  category_id: z.string().min(1, 'Category is required'),
  transaction_date: z.string().min(1, 'Date is required'),
  transaction_time: z.string().min(1, 'Time is required'),
  description: z.string().optional(),
  merchant: z.string().optional(),
  payment_method: z.enum(['cash', 'upi', 'credit_card', 'debit_card', 'net_banking', 'other']).optional(),
})
type FormData = z.infer<typeof schema>

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'other', label: 'Other' },
]

interface TransactionFormProps {
  defaultType?: TransactionType
  transaction?: Transaction
  onSuccess: () => void
}

export default function TransactionForm({ defaultType = 'expense', transaction, onSuccess }: TransactionFormProps) {
  const qc = useQueryClient()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: transaction?.type ?? defaultType,
      amount: transaction?.amount,
      category_id: transaction?.category_id ?? '',
      transaction_date: transaction?.transaction_date ?? todayISO(),
      transaction_time: transaction?.transaction_time ?? nowTime(),
      description: transaction?.description ?? '',
      merchant: transaction?.merchant ?? '',
      payment_method: transaction?.payment_method ?? undefined,
    },
  })

  const type = watch('type') as TransactionType

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', type],
    queryFn: () => fetchCategories(type),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      if (transaction) return updateTransaction(transaction.id, data)
      return createTransaction(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['budget'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onSuccess()
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      {/* Type toggle */}
      <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
        {(['expense', 'income'] as TransactionType[]).map((t) => (
          <label key={t} className="flex-1 cursor-pointer">
            <input {...register('type')} type="radio" value={t} className="sr-only" />
            <div className={`text-center py-2 text-sm font-medium rounded-md transition-colors ${watch('type') === t ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
              {t === 'expense' ? '💸 Expense' : '💰 Income'}
            </div>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="label">Amount (₹)</label>
          <input {...register('amount')} type="number" step="0.01" className="input" placeholder="0.00" />
          {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label">Category</label>
          <select {...register('category_id')} className="input">
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input {...register('transaction_date')} type="date" className="input" />
          {errors.transaction_date && <p className="text-xs text-red-500 mt-1">{errors.transaction_date.message}</p>}
        </div>
        <div>
          <label className="label">Time</label>
          <input {...register('transaction_time')} type="time" className="input" />
        </div>
      </div>

      <div>
        <label className="label">Description</label>
        <input {...register('description')} type="text" className="input" placeholder="What's this for?" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Merchant</label>
          <input {...register('merchant')} type="text" className="input" placeholder="Merchant name" />
        </div>
        <div>
          <label className="label">Payment Method</label>
          <select {...register('payment_method')} className="input">
            <option value="">Select</option>
            {paymentMethods.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {mutation.error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          <AlertCircle size={16} />
          {(mutation.error as Error).message}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Saving…' : transaction ? 'Update' : 'Add Transaction'}
        </button>
      </div>
    </form>
  )
}
