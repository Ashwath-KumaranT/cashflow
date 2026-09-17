import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, Sun, Monitor, User, Shield, Download, LogOut } from 'lucide-react'
import { fetchProfile, upsertProfile } from '@/services/profiles'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from '@/app/providers/ThemeProvider'
import { supabase } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { fetchTransactions } from '@/services/transactions'
import { format } from 'date-fns'

const profileSchema = z.object({ full_name: z.string().min(1, 'Name is required') })

export default function Settings() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const qc = useQueryClient()
  const [pwdStatus, setPwdStatus] = useState<string | null>(null)
  const [pwdLoading, setPwdLoading] = useState(false)

  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile })

  const profileMutation = useMutation({
    mutationFn: ({ full_name }: { full_name: string }) => upsertProfile({ full_name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    values: profile ? { full_name: profile.full_name ?? '' } : undefined,
  })

  const sendPasswordReset = async () => {
    if (!user?.email) return
    setPwdLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin })
    setPwdStatus(error ? error.message : 'Password reset email sent!')
    setPwdLoading(false)
  }

  const exportAllData = async () => {
    const data = await fetchTransactions()
    const rows = [
      ['Date', 'Type', 'Category', 'Description', 'Merchant', 'Amount', 'Payment Method'],
      ...data.map(t => [t.transaction_date, t.type, t.category?.name ?? '', t.description ?? '', t.merchant ?? '', t.amount, t.payment_method ?? '']),
    ]
    const csv = rows.map(r => r.map(String).map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cashflow-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  if (isLoading) return <LoadingSpinner />

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>

      {/* Profile */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <User size={20} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800 dark:text-white">Profile</h2>
        </div>
        <form onSubmit={handleSubmit(d => profileMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input {...register('full_name')} className="input" placeholder="Your name" />
            {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email ?? ''} disabled className="input bg-slate-50 dark:bg-slate-700 cursor-not-allowed" />
          </div>
          <button type="submit" disabled={profileMutation.isPending} className="btn-primary">
            {profileMutation.isPending ? 'Saving…' : 'Save Profile'}
          </button>
          {profileMutation.isSuccess && <p className="text-sm text-emerald-500">Profile updated!</p>}
        </form>
      </div>

      {/* Theme */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Sun size={20} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800 dark:text-white">Appearance</h2>
        </div>
        <div className="flex gap-3">
          {themeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all',
                theme === value ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'
              )}
            >
              <Icon size={20} className={theme === value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
              <span className={cn('text-sm font-medium', theme === value ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400')}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={20} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800 dark:text-white">Security</h2>
        </div>
        <button onClick={sendPasswordReset} disabled={pwdLoading} className="btn-secondary">
          {pwdLoading ? 'Sending…' : 'Send Password Reset Email'}
        </button>
        {pwdStatus && <p className="text-sm text-emerald-500 mt-2">{pwdStatus}</p>}
      </div>

      {/* Data */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Download size={20} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800 dark:text-white">Data Export</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Export all your transactions as a CSV file.</p>
        <button onClick={exportAllData} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> Export All Data (CSV)
        </button>
      </div>

      {/* Sign out */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <LogOut size={20} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800 dark:text-white">Account</h2>
        </div>
        <button onClick={signOut} className="btn-danger flex items-center gap-2">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  )
}
