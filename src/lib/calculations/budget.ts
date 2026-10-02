import { getDaysInMonth, getDate, startOfMonth, endOfMonth } from 'date-fns'
import { toDateKey } from '@/lib/utils'

export interface BudgetCalculation {
  monthlyBudget: number
  totalExpenses: number
  remainingMonthlyBudget: number
  remainingDays: number
  dynamicDailyAllowance: number
  todaySpent: number
  todayRemaining: number
  isOverBudget: boolean
  percentageUsed: number
}

export function calculateRemainingDays(referenceDate: Date = new Date()): number {
  const lastDayOfMonth = getDaysInMonth(referenceDate)
  const today = getDate(referenceDate)
  return lastDayOfMonth - today + 1
}

export function calculateRemainingMonthlyBudget(monthlyBudget: number, totalExpenses: number): number {
  return monthlyBudget - totalExpenses
}

export function calculateDynamicDailyAllowance(remainingBudget: number, remainingDays: number): number {
  if (remainingDays <= 0) return 0
  return remainingBudget / remainingDays
}

export function calculateBudget(
  monthlyBudget: number,
  monthExpenses: number[],
  todayExpenses: number[],
  referenceDate: Date = new Date()
): BudgetCalculation {
  const totalExpenses = monthExpenses.reduce((sum, amt) => sum + amt, 0)
  const remainingMonthlyBudget = calculateRemainingMonthlyBudget(monthlyBudget, totalExpenses)
  const remainingDays = calculateRemainingDays(referenceDate)
  const dynamicDailyAllowance = calculateDynamicDailyAllowance(remainingMonthlyBudget, remainingDays)
  const todaySpent = todayExpenses.reduce((sum, amt) => sum + amt, 0)
  const todayRemaining = dynamicDailyAllowance - todaySpent
  const isOverBudget = remainingMonthlyBudget < 0
  const percentageUsed = monthlyBudget > 0 ? (totalExpenses / monthlyBudget) * 100 : 0

  return {
    monthlyBudget,
    totalExpenses,
    remainingMonthlyBudget,
    remainingDays,
    dynamicDailyAllowance,
    todaySpent,
    todayRemaining,
    isOverBudget,
    percentageUsed,
  }
}

export function getMonthStart(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function getMonthDateRange(date: Date = new Date()): { start: string; end: string } {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  return {
    start: toDateKey(start),
    end: toDateKey(end),
  }
}
