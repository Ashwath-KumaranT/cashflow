import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { seedDefaultCategories } from '@/services/categories'
import { ensureProfile } from '@/services/profiles'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Drop the previous user's cached rows so nothing leaks across accounts.
      if (event === 'SIGNED_OUT') qc.clear()

      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const fallbackName = session.user.user_metadata?.full_name
            ?? session.user.email?.split('@')[0]
            ?? 'User'
          await ensureProfile(session.user.id, fallbackName)
          await seedDefaultCategories(session.user.id)
        } catch {
          // Non-fatal; user can still use the app
        }
        // Surfaces this account's stored name and theme preference.
        qc.invalidateQueries({ queryKey: ['profile'] })
      }
    })

    return () => subscription.unsubscribe()
  }, [qc])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
