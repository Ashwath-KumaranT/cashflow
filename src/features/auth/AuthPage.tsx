import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/siteUrl'
import { TrendingUp, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const authSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type AuthForm = z.infer<typeof authSchema>

const forgotSchema = z.object({ email: z.string().email('Enter a valid email') })
type ForgotForm = z.infer<typeof forgotSchema>

export default function AuthPage() {
  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<AuthForm>({ resolver: zodResolver(authSchema) })
  const forgotForm = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) })

  const onSubmit = async (data: AuthForm) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (tab === 'signin') {
        const { error } = await supabase.auth.signInWithPassword(data)
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ ...data, options: { emailRedirectTo: getSiteUrl() } })
        if (error) throw error
        setSuccess('Account created! Check your email to verify.')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const onForgot = async (data: ForgotForm) => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess('Password reset email sent. Check your inbox.')
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getSiteUrl() } })
  }

  const signInWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: getSiteUrl() } })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="bg-emerald-500 text-white p-2 rounded-xl">
              <TrendingUp size={28} />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">CashFlow</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">Simple day-to-day money control</p>
        </div>

        <div className="card p-8">
          {tab !== 'forgot' && (
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1 mb-6">
              {(['signin', 'signup'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); setSuccess(null) }}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                    tab === t
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {t === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg mb-4 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg mb-4 text-sm">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              {success}
            </div>
          )}

          {tab === 'forgot' ? (
            <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input {...forgotForm.register('email')} type="email" className="input" placeholder="you@example.com" />
                {forgotForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{forgotForm.formState.errors.email.message}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending…' : 'Send Reset Email'}
              </button>
              <button type="button" onClick={() => setTab('signin')} className="w-full text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                ← Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              {tab === 'signin' && (
                <div className="text-right">
                  <button type="button" onClick={() => { setTab('forgot'); setError(null) }} className="text-sm text-emerald-600 hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-600" /></div>
                <div className="relative text-center text-xs text-slate-400 bg-white dark:bg-slate-800 px-2 w-fit mx-auto">or continue with</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={signInWithGoogle} className="btn-secondary flex items-center justify-center gap-2 text-sm">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </button>
                <button type="button" onClick={signInWithGitHub} className="btn-secondary flex items-center justify-center gap-2 text-sm">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
                  GitHub
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
