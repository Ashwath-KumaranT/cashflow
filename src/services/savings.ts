import { supabase } from '@/lib/supabase/client'
import type { SavingsGoal, SavingsContribution, SavingsAccount, SavingsGoalStatus } from '@/types/database'

export async function fetchSavingsGoals(): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createSavingsGoal(input: {
  name: string
  target_amount: number
  target_date?: string
  icon?: string
  color?: string
}): Promise<SavingsGoal> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      ...input,
      user_id: user.id,
      current_amount: 0,
      icon: input.icon ?? '🎯',
      color: input.color ?? '#10b981',
      status: 'active' as SavingsGoalStatus,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSavingsGoal(id: string, input: Partial<{
  name: string
  target_amount: number
  target_date: string
  icon: string
  color: string
  status: SavingsGoalStatus
}>): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from('savings_goals')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addContribution(input: {
  goal_id: string | null
  amount: number
  contribution_date: string
  note?: string
}): Promise<SavingsContribution> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('savings_contributions')
    .insert({ ...input, user_id: user.id })
    .select()
    .single()

  if (error) throw error

  if (input.goal_id) {
    await supabase.rpc('increment_goal_amount', { goal_id: input.goal_id, increment: input.amount })
  }

  return data
}

export async function fetchContributions(goalId?: string): Promise<SavingsContribution[]> {
  let query = supabase
    .from('savings_contributions')
    .select('*')
    .order('contribution_date', { ascending: false })

  if (goalId) query = query.eq('goal_id', goalId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchSavingsAccounts(): Promise<SavingsAccount[]> {
  const { data, error } = await supabase
    .from('savings_accounts')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function createSavingsAccount(input: {
  name: string
  balance: number
  institution?: string
  note?: string
}): Promise<SavingsAccount> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('savings_accounts')
    .insert({ ...input, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSavingsAccount(id: string, input: Partial<{
  name: string
  balance: number
  institution: string
  note: string
}>): Promise<SavingsAccount> {
  const { data, error } = await supabase
    .from('savings_accounts')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
