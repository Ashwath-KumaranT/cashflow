import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Archive, Edit2 } from 'lucide-react'
import { fetchCategories, createCategory, updateCategory, archiveCategory } from '@/services/categories'
import type { Category, CategoryType } from '@/types/database'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.enum(['expense', 'income']),
  icon: z.string().min(1, 'Icon required'),
  color: z.string().min(1),
})
type FormData = z.infer<typeof schema>

const ICON_OPTIONS = ['🍽️', '🚗', '🛍️', '🎬', '💊', '⚡', '🏠', '📚', '💆', '💰', '💼', '💻', '🏢', '📈', '💵', '🎯', '🏋️', '✈️', '🎁', '📱']
const COLOR_OPTIONS = ['#10b981', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#eab308', '#ef4444', '#64748b', '#06b6d4', '#f43f5e']

export default function Categories() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<CategoryType>('expense')
  const [addModal, setAddModal] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [archiveCat, setArchiveCat] = useState<Category | null>(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', tab],
    queryFn: () => fetchCategories(tab),
  })

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setAddModal(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<FormData>) => updateCategory(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditCat(null) },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveCategory(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setArchiveCat(null) },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Categories</h1>
        <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1 w-fit">
        {(['expense', 'income'] as CategoryType[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm font-medium rounded-md transition-colors', tab === t ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500')}
          >
            {t === 'expense' ? '💸 Expense' : '💰 Income'}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-700">
          {categories.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-8">No categories</p>
          )}
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: cat.color + '20' }}>
                {cat.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-white">{cat.name}</p>
                {cat.is_default && <p className="text-xs text-slate-400">Default</p>}
              </div>
              <div className="flex gap-1">
                {!cat.is_default && (
                  <>
                    <button onClick={() => setEditCat(cat)} className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg" aria-label="Edit">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setArchiveCat(cat)} className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg" aria-label="Archive">
                      <Archive size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Category" size="sm">
        <CategoryForm
          defaultType={tab}
          onSubmit={d => createMutation.mutate(d)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editCat} onClose={() => setEditCat(null)} title="Edit Category" size="sm">
        {editCat && (
          <CategoryForm
            initial={editCat}
            defaultType={tab}
            onSubmit={d => updateMutation.mutate({ id: editCat.id, ...d })}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!archiveCat}
        onClose={() => setArchiveCat(null)}
        onConfirm={() => archiveCat && archiveMutation.mutate(archiveCat.id)}
        title="Archive Category"
        message={`Archive "${archiveCat?.name}"? Existing transactions will remain but you won't be able to use this category for new ones.`}
        confirmLabel="Archive"
        loading={archiveMutation.isPending}
      />
    </div>
  )
}

function CategoryForm({ initial, defaultType, onSubmit, loading }: {
  initial?: Category
  defaultType: CategoryType
  onSubmit: (d: FormData) => void
  loading: boolean
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? defaultType,
      icon: initial?.icon ?? '💰',
      color: initial?.color ?? '#10b981',
    },
  })
  const selectedIcon = watch('icon')
  const selectedColor = watch('color')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Name</label>
        <input {...register('name')} className="input" placeholder="Category name" />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="label">Type</label>
        <select {...register('type')} className="input">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <div>
        <label className="label">Icon</label>
        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map(icon => (
            <button
              key={icon}
              type="button"
              onClick={() => setValue('icon', icon)}
              className={cn('text-xl w-10 h-10 rounded-lg border-2 transition-all', selectedIcon === icon ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-transparent hover:border-slate-200')}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setValue('color', color)}
              className={cn('w-8 h-8 rounded-full border-2 transition-all', selectedColor === color ? 'border-slate-700 dark:border-white scale-110' : 'border-transparent')}
              style={{ background: color }}
            />
          ))}
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Saving…' : initial ? 'Update Category' : 'Add Category'}
      </button>
    </form>
  )
}
