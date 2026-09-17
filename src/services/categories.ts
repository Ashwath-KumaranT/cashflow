import { supabase } from '@/lib/supabase/client'
import type { Category, CategoryType } from '@/types/database'

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍽️', color: '#f97316' },
  { name: 'Transport', icon: '🚗', color: '#3b82f6' },
  { name: 'Shopping', icon: '🛍️', color: '#a855f7' },
  { name: 'Entertainment', icon: '🎬', color: '#ec4899' },
  { name: 'Health', icon: '💊', color: '#ef4444' },
  { name: 'Utilities', icon: '⚡', color: '#eab308' },
  { name: 'Housing', icon: '🏠', color: '#6366f1' },
  { name: 'Education', icon: '📚', color: '#14b8a6' },
  { name: 'Personal Care', icon: '💆', color: '#f472b6' },
  { name: 'Other', icon: '💰', color: '#94a3b8' },
]

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: '💼', color: '#10b981' },
  { name: 'Freelance', icon: '💻', color: '#06b6d4' },
  { name: 'Business', icon: '🏢', color: '#8b5cf6' },
  { name: 'Investment Returns', icon: '📈', color: '#f59e0b' },
  { name: 'Other Income', icon: '💵', color: '#64748b' },
]

export async function fetchCategories(type?: CategoryType): Promise<Category[]> {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('is_archived', false)
    .order('is_default', { ascending: false })
    .order('name')

  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createCategory(input: {
  name: string
  type: CategoryType
  icon: string
  color: string
}): Promise<Category> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, user_id: user.id, is_default: false, is_archived: false })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCategory(id: string, input: Partial<{ name: string; icon: string; color: string }>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function seedDefaultCategories(userId: string): Promise<void> {
  const expenseCategories = DEFAULT_EXPENSE_CATEGORIES.map(c => ({
    ...c, user_id: userId, type: 'expense' as CategoryType, is_default: true, is_archived: false,
  }))
  const incomeCategories = DEFAULT_INCOME_CATEGORIES.map(c => ({
    ...c, user_id: userId, type: 'income' as CategoryType, is_default: true, is_archived: false,
  }))

  const { error } = await supabase
    .from('categories')
    .upsert([...expenseCategories, ...incomeCategories], { onConflict: 'user_id,name,type', ignoreDuplicates: true })

  if (error) throw error
}
