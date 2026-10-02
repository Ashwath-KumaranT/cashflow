import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase/client'
import { TrendingUp, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

const schema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })
type FormData = z.infer<typeof schema>

type Status = 'verifying' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('verifying')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    let settled = false

    // Supabase reports expired/consumed links via the URL fragment.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(window.location.search)
    const urlError = hash.get('error_description') ?? query.get('error_description')
    if (urlError) {
      setLinkError(urlError.replace(/\+/g, ' '))
      setStatus('invalid')
      return
    }

    // PKCE-style links arrive as ?token_hash=...&type=recovery and need an explicit exchange.
    const tokenHash = query.get('token_hash')
    if (tokenHash) {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        .then(({ error }) => {
          settled = true
          if (error) { setLinkError(error.message); setStatus('invalid') }
          else setStatus('ready')
        })
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        settled = true
        setStatus('ready')
      }
    })

    // Implicit links are consumed by detectSessionInUrl before we mount, so an
    // existing session is itself proof the link was valid.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { settled = true; setStatus('ready') }
    })

    const timeout = setTimeout(() => {
      if (!settled) {
        setLinkError('This reset link is invalid or has expired. Request a new one.')
        setStatus('invalid')
      }
    }, 4000)

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  const onSubmit = async ({ password }: FormData) => {
    setSubmitError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setSubmitError(error.message); return }
    // The recovery link leaves an active session. Clear it so the user signs in
    // with the new password — and so PublicRoute doesn't bounce them off /auth.
    await supabase.auth.signOut()
    setStatus('done')
  }

  useEffect(() => {
    if (status !== 'done') return
    const t = setTimeout(() => navigate('/auth', { replace: true }), 2000)
    return () => clearTimeout(t)
  }, [status, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="bg-emerald-500 text-white p-2 rounded-xl">
              <TrendingUp size={28} />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">CashFlow</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">Choose a new password</p>
        </div>

        <div className="card p-8">
          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Verifying your reset link…</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {linkError}
              </div>
              <button onClick={() => navigate('/auth')} className="btn-primary w-full">
                Back to Sign In
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                Password updated. Sign in with your new password.
              </div>
              <button onClick={() => navigate('/auth', { replace: true })} className="btn-primary w-full">
                Go to Sign In
              </button>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">New password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    autoComplete="new-password"
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

              <div>
                <label className="label">Confirm new password</label>
                <input
                  {...register('confirm')}
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
              </div>

              {submitError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {submitError}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
