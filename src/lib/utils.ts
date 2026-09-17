import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function nowTime(): string {
  return new Date().toTimeString().slice(0, 5)
}
