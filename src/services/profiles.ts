import { supabase } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export async function fetchProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Creates the profile row only when absent. Never overwrites existing values —
 * a plain upsert here would reset full_name to the email prefix on every sign-in.
 */
export async function ensureProfile(userId: string, fallbackName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        full_name: fallbackName,
        currency: 'INR',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )

  if (error) throw error
}

export async function upsertProfile(input: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, ...input, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}
