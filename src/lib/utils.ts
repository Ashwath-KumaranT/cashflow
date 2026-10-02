import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * YYYY-MM-DD in the user's local timezone.
 * toISOString() converts to UTC first, so east-of-UTC zones get the previous
 * day for any local midnight — which silently shifts every date by one.
 */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function todayISO(): string {
  return toDateKey(new Date())
}

export function nowTime(): string {
  return new Date().toTimeString().slice(0, 5)
}
