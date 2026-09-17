export type TransactionType = 'expense' | 'income'
export type InvestmentType = 'stocks' | 'mutual_funds' | 'crypto' | 'bonds' | 'real_estate' | 'fixed_deposit' | 'other'
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type SavingsGoalStatus = 'active' | 'completed' | 'paused'
export type PaymentMethod = 'cash' | 'upi' | 'credit_card' | 'debit_card' | 'net_banking' | 'other'
export type CategoryType = 'expense' | 'income'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  currency: string
  timezone: string
  theme: 'light' | 'dark' | 'system'
  created_at: string
  updated_at: string
}

export interface MonthlyBudget {
  id: string
  user_id: string
  month_start: string
  amount: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  is_default: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  category_id: string | null
  transaction_date: string
  transaction_time: string
  description: string | null
  merchant: string | null
  payment_method: PaymentMethod | null
  receipt_path: string | null
  recurring_rule_id: string | null
  created_at: string
  updated_at: string
  category?: Category
}

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  icon: string
  color: string
  status: SavingsGoalStatus
  created_at: string
  updated_at: string
}

export interface SavingsContribution {
  id: string
  user_id: string
  goal_id: string | null
  amount: number
  contribution_date: string
  note: string | null
  created_at: string
}

export interface SavingsAccount {
  id: string
  user_id: string
  name: string
  balance: number
  institution: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface Investment {
  id: string
  user_id: string
  name: string
  investment_type: InvestmentType
  invested_amount: number
  current_value: number
  purchase_date: string
  note: string | null
  created_at: string
  updated_at: string
}

export interface RecurringTransaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  category_id: string | null
  frequency: RecurringFrequency
  next_run_date: string
  end_date: string | null
  description: string | null
  merchant: string | null
  active: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  read_at: string | null
  created_at: string
}
