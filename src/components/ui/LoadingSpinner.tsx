import { cn } from '@/lib/utils'

export default function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center items-center py-12', className)}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" aria-label="Loading" />
    </div>
  )
}
