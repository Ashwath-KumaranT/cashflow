import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProfile } from '@/hooks/useProfile'
import { upsertProfile } from '@/services/profiles'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'cashflow-theme'

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const { data: profile } = useProfile()
  // localStorage applies instantly on load; the account value is the source of
  // truth and overrides it once fetched, so the choice follows the user's login.
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  const getResolved = (t: Theme): 'light' | 'dark' => {
    if (t === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return t
  }

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => getResolved(theme))

  useEffect(() => {
    const resolved = getResolved(theme)
    setResolvedTheme(resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const resolved = getResolved('system')
      setResolvedTheme(resolved)
      document.documentElement.classList.toggle('dark', resolved === 'dark')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const adoptedRef = useRef<Theme | null>(null)

  useEffect(() => {
    const remote = profile?.theme
    if (!remote || adoptedRef.current === remote) return
    adoptedRef.current = remote
    localStorage.setItem(STORAGE_KEY, remote)
    setThemeState(remote)
  }, [profile?.theme])

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t)
    setThemeState(t)
    adoptedRef.current = t
    // Signed-out users keep the localStorage-only preference.
    upsertProfile({ theme: t })
      .then(() => qc.invalidateQueries({ queryKey: ['profile'] }))
      .catch(() => {})
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
