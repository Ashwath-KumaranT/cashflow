import { supabase } from '@/lib/supabase/client'
import type { Investment, InvestmentType } from '@/types/database'

export function calculateReturn(investedAmount: number, currentValue: number) {
  const profitLoss = currentValue - investedAmount
  const returnPct = investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0
  return { profitLoss, returnPct }
}

export async function fetchInvestments(): Promise<Investment[]> {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .order('purchase_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createInvestment(input: {
  name: string
  investment_type: InvestmentType
  invested_amount: number
  current_value: number
  purchase_date: string
  note?: string
}): Promise<Investment> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('investments')
    .insert({ ...input, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateInvestment(id: string, input: Partial<{
  name: string
  investment_type: InvestmentType
  invested_amount: number
  current_value: number
  purchase_date: string
  note: string
}>): Promise<Investment> {
  const { data, error } = await supabase
    .from('investments')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteInvestment(id: string): Promise<void> {
  const { error } = await supabase.from('investments').delete().eq('id', id)
  if (error) throw error
}
