import { supabase } from '@/lib/supabase/client'
import type { Transaction, TransactionType, PaymentMethod } from '@/types/database'

export interface TransactionInput {
  type: TransactionType
  amount: number
  category_id: string | null
  transaction_date: string
  transaction_time: string
  description?: string
  merchant?: string
  payment_method?: PaymentMethod
  receipt_path?: string
  recurring_rule_id?: string
}

export async function fetchTransactions(filters?: {
  startDate?: string
  endDate?: string
  type?: TransactionType
  categoryId?: string
  search?: string
  limit?: number
}) {
  let query = supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .order('transaction_date', { ascending: false })
    .order('transaction_time', { ascending: false })

  if (filters?.startDate) query = query.gte('transaction_date', filters.startDate)
  if (filters?.endDate) query = query.lte('transaction_date', filters.endDate)
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters?.search) {
    query = query.or(`description.ilike.%${filters.search}%,merchant.ilike.%${filters.search}%`)
  }
  if (filters?.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw error
  return data as Transaction[]
}

export async function createTransaction(input: TransactionInput) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...input, user_id: user.id })
    .select('*, category:categories(*)')
    .single()

  if (error) throw error
  return data as Transaction
}

export async function updateTransaction(id: string, input: Partial<TransactionInput>) {
  const { data, error } = await supabase
    .from('transactions')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, category:categories(*)')
    .single()

  if (error) throw error
  return data as Transaction
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}
