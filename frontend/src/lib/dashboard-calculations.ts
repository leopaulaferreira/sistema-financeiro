import type { Account, AccountBalance, CategoryExpense, DailyIncomeExpense, DashboardSummary, Transaction } from '@/types/finance'
import { mockCategories } from '@/mocks/categories'

/** `year`/`month` representam o intervalo half-open [from, to) — ver ARCHITECTURE.md §8.1. */
function monthRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const toDate = new Date(year, month, 1)
  const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-01`
  return { from, to }
}

function inRange(date: string, from: string, to: string) {
  return date >= from && date < to
}

export function computeSummary(transactions: Transaction[], accounts: Account[], year: number, month: number): DashboardSummary {
  const { from, to } = monthRange(year, month)
  const monthTx = transactions.filter((t) => inRange(t.date, from, to))

  const totalIncome = monthTx.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = monthTx.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0)
  const netSavings = totalIncome - totalExpenses

  const cashAccountIds = new Set(accounts.filter((a) => a.type !== 'CREDIT_CARD').map((a) => a.id))
  const initialBalanceSum = accounts.filter((a) => a.type !== 'CREDIT_CARD').reduce((sum, a) => sum + a.initialBalance, 0)
  const cumulativeTx = transactions.filter((t) => t.date < to && cashAccountIds.has(t.accountId))
  const cumulativeIncome = cumulativeTx.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0)
  const cumulativeExpense = cumulativeTx.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0)
  const availableBalance = initialBalanceSum + cumulativeIncome - cumulativeExpense

  return { totalIncome, totalExpenses, netSavings, availableBalance }
}

export function computeExpensesByCategory(transactions: Transaction[], year: number, month: number): CategoryExpense[] {
  const { from, to } = monthRange(year, month)
  const expenses = transactions.filter((t) => t.type === 'EXPENSE' && inRange(t.date, from, to))
  const total = expenses.reduce((sum, t) => sum + t.amount, 0)

  const byCategory = new Map<string, number>()
  for (const t of expenses) {
    byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amount)
  }

  return Array.from(byCategory.entries())
    .map(([categoryId, amount]) => {
      const category = mockCategories.find((c) => c.id === categoryId)
      return {
        categoryId,
        categoryName: category?.name ?? 'Sem categoria',
        color: category?.color ?? 'var(--muted-foreground)',
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

export function computeIncomeVsExpenseDaily(transactions: Transaction[], year: number, month: number): DailyIncomeExpense[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  const { from, to } = monthRange(year, month)
  const monthTx = transactions.filter((t) => inRange(t.date, from, to))

  const days: DailyIncomeExpense[] = Array.from({ length: daysInMonth }, (_, i) => ({
    date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    income: 0,
    expense: 0,
  }))

  for (const t of monthTx) {
    const day = Number(t.date.slice(8, 10))
    const entry = days[day - 1]
    if (!entry) continue
    if (t.type === 'INCOME') entry.income += t.amount
    else entry.expense += t.amount
  }

  return days
}

export function computeRecentTransactions(transactions: Transaction[], limit: number): Transaction[] {
  const capped = Math.min(limit, 50)
  return [...transactions]
    .sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)))
    .slice(0, capped)
}

export function computeAccountBalance(account: Account, transactions: Transaction[]): number {
  const accountTx = transactions.filter((t) => t.accountId === account.id)
  const income = accountTx.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0)
  const expense = accountTx.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0)
  return account.initialBalance + income - expense
}

export function computeAccountsBalance(accounts: Account[], transactions: Transaction[]): AccountBalance[] {
  return accounts
    .filter((a) => a.type !== 'CREDIT_CARD')
    .map((account) => ({
      accountId: account.id,
      accountName: account.name,
      accountType: account.type,
      balance: computeAccountBalance(account, transactions),
    }))
}
