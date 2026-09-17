import { supabase } from '@/lib/supabase/client'
import type { MonthlyBudget } from '@/types/database'
import { getMonthStart } from '@/lib/calculations/budget'
import { subMonths } from 'date-fns'

export async function fetchMonthlyBudget(monthStart?: string): Promise<MonthlyBudget | null> {
  const ms = monthStart ?? getMonthStart()

  const { data, error } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('month_start', ms)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertMonthlyBudget(amount: number, monthStart?: string): Promise<MonthlyBudget> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const ms = monthStart ?? getMonthStart()

  const { data, error } = await supabase
    .from('monthly_budgets')
    .upsert(
      { user_id: user.id, month_start: ms, amount, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,month_start' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function copyPreviousMonthBudget(): Promise<MonthlyBudget | null> {
  const prevMonth = subMonths(new Date(), 1)
  const prevMonthStart = getMonthStart(prevMonth)
  const previous = await fetchMonthlyBudget(prevMonthStart)
  if (!previous) return null
  return upsertMonthlyBudget(previous.amount)
}
