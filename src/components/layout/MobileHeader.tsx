import { TrendingUp } from 'lucide-react'

export default function MobileHeader() {
  return (
    <header className="md:hidden flex items-center gap-2 px-4 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="bg-emerald-500 text-white p-1.5 rounded-lg">
        <TrendingUp size={18} />
      </div>
      <span className="text-lg font-bold text-slate-800 dark:text-white">CashFlow</span>
    </header>
  )
}
