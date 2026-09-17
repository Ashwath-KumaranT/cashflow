import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: ReactNode
  variant?: 'default' | 'positive' | 'negative' | 'warning'
  className?: string
}

const variantStyles = {
  default: 'text-slate-800 dark:text-white',
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-red-500 dark:text-red-400',
  warning: 'text-amber-500 dark:text-amber-400',
}

export default function StatCard({ title, value, subtitle, icon, variant = 'default', className }: StatCardProps) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
          <p className={cn('text-2xl font-bold mt-1 truncate', variantStyles[variant])}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className="ml-3 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
