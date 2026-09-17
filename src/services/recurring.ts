import { supabase } from '@/lib/supabase/client'
import type { RecurringTransaction, TransactionType, RecurringFrequency } from '@/types/database'
import { addDays, addWeeks, addMonths, addYears, parseISO } from 'date-fns'

export function getNextRunDate(current: string, frequency: RecurringFrequency): string {
  const date = parseISO(current)
  let next: Date
  switch (frequency) {
    case 'daily': next = addDays(date, 1); break
    case 'weekly': next = addWeeks(date, 1); break
    case 'monthly': next = addMonths(date, 1); break
    case 'yearly': next = addYears(date, 1); break
  }
  return next.toISOString().split('T')[0]
}

export async function fetchRecurringTransactions(): Promise<RecurringTransaction[]> {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*, category:categories(*)')
    .order('next_run_date')
  if (error) throw error
  return data
}

export async function createRecurringTransaction(input: {
  type: TransactionType
  amount: number
  category_id?: string
  frequency: RecurringFrequency
  next_run_date: string
  end_date?: string
  description?: string
  merchant?: string
}): Promise<RecurringTransaction> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({ ...input, user_id: user.id, active: true })
    .select('*, category:categories(*)')
    .single()

  if (error) throw error
  return data
}

export async function processRecurringTransactions(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const { data: due, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('active', true)
    .lte('next_run_date', today)

  if (error) throw error
  if (!due?.length) return

  for (const rule of due) {
    if (rule.end_date && rule.next_run_date > rule.end_date) {
      await supabase.from('recurring_transactions').update({ active: false }).eq('id', rule.id)
      continue
    }

    // Idempotency check: has a transaction already been generated for this rule+date?
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('recurring_rule_id', rule.id)
      .eq('transaction_date', rule.next_run_date)

    if (!count || count === 0) {
      await supabase.from('transactions').insert({
        user_id: rule.user_id,
        type: rule.type,
        amount: rule.amount,
        category_id: rule.category_id,
        transaction_date: rule.next_run_date,
        transaction_time: '00:00',
        description: rule.description,
        merchant: rule.merchant,
        recurring_rule_id: rule.id,
      })
    }

    const nextDate = getNextRunDate(rule.next_run_date, rule.frequency)
    await supabase
      .from('recurring_transactions')
      .update({ next_run_date: nextDate })
      .eq('id', rule.id)
  }
}

export async function toggleRecurringActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('recurring_transactions')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteRecurring(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_transactions').delete().eq('id', id)
  if (error) throw error
}
