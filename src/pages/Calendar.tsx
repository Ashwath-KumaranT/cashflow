import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { fetchTransactions } from '@/services/transactions'
import { fetchMonthlyBudget } from '@/services/budgets'
import { calculateBudget } from '@/lib/calculations/budget'
import { formatCurrency } from '@/lib/formatting/currency'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { cn, toDateKey } from '@/lib/utils'

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', 'calendar', format(currentMonth, 'yyyy-MM')],
    queryFn: () => fetchTransactions({
      startDate: toDateKey(monthStart),
      endDate: toDateKey(monthEnd),
    }),
  })

  const { data: budget } = useQuery({
    queryKey: ['budget', toDateKey(monthStart)],
    queryFn: () => fetchMonthlyBudget(toDateKey(monthStart)),
  })

  const expenses = transactions.filter(t => t.type === 'expense')
  const budgetCalc = calculateBudget(
    budget?.amount ?? 0,
    expenses.map(t => t.amount),
    [],
    currentMonth
  )

  // Map date -> daily spend
  const dailySpend: Record<string, number> = {}
  expenses.forEach(t => {
    dailySpend[t.transaction_date] = (dailySpend[t.transaction_date] ?? 0) + t.amount
  })

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = getDay(monthStart)

  const selectedDateStr = selectedDay ? toDateKey(selectedDay) : undefined
  const selectedDayTx = transactions.filter(t => t.transaction_date === selectedDateStr)

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-secondary p-2" aria-label="Previous month"><ChevronLeft size={18} /></button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[130px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-secondary p-2" aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 card p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
            ))}
          </div>
          {/* Empty cells for offset */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map(day => {
              const dateStr = toDateKey(day)
              const spend = dailySpend[dateStr] ?? 0
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const isToday = isSameDay(day, new Date())
              const isOver = budget && spend > budgetCalc.dynamicDailyAllowance && spend > 0

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(-1)) ? null : day)}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all border',
                    isSelected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-600',
                    isToday && !isSelected && 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                  )}
                >
                  <span className={cn('font-medium', isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300')}>
                    {format(day, 'd')}
                  </span>
                  {spend > 0 && (
                    <span className={cn('text-[10px] font-medium mt-0.5', isOver ? 'text-red-500' : 'text-slate-500 dark:text-slate-400')}>
                      ₹{spend >= 1000 ? `${(spend / 1000).toFixed(1)}k` : spend.toFixed(0)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Day detail */}
        <div className="card p-5">
          {selectedDay ? (
            <>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
                {format(selectedDay, 'EEEE, MMMM d')}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Total: {formatCurrency(dailySpend[selectedDateStr!] ?? 0)}
              </p>
              {selectedDayTx.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No transactions</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayTx.map(t => (
                    <div key={t.id} className="flex items-center gap-3">
                      <span className="text-xl">{t.category?.icon ?? '💰'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                          {t.description || t.merchant || t.category?.name}
                        </p>
                        <p className="text-xs text-slate-400">{t.transaction_time}</p>
                      </div>
                      <span className={cn('text-sm font-bold', t.type === 'expense' ? 'text-red-500' : 'text-emerald-500')}>
                        {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <CalendarDays className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={36} />
              <p className="text-sm text-slate-400">Select a day to see transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
