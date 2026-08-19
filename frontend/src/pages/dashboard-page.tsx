import { useMemo } from 'react'
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/common/loading-skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FinancialChart } from '@/features/dashboard/components/financial-chart'
import { CategoryChart } from '@/features/dashboard/components/category-chart'
import { TransactionTable } from '@/features/transactions/components/transaction-table'
import { AccountCard } from '@/features/accounts/components/account-card'
import { mockAccounts, mockTransactions, CURRENT_PERIOD } from '@/mocks'
import {
  computeSummary,
  computeExpensesByCategory,
  computeIncomeVsExpenseDaily,
  computeRecentTransactions,
  computeAccountsBalance,
} from '@/lib/dashboard-calculations'
import { formatCurrency } from '@/lib/format'
import { useMockLoading } from '@/hooks/use-mock-loading'

export function DashboardPage() {
  const loading = useMockLoading()
  const { year, month } = CURRENT_PERIOD

  const summary = useMemo(() => computeSummary(mockTransactions, mockAccounts, year, month), [year, month])
  const categoryExpenses = useMemo(() => computeExpensesByCategory(mockTransactions, year, month), [year, month])
  const dailySeries = useMemo(() => computeIncomeVsExpenseDaily(mockTransactions, year, month), [year, month])
  const recentTransactions = useMemo(() => computeRecentTransactions(mockTransactions, 8), [])
  const accountsBalance = useMemo(() => computeAccountsBalance(mockAccounts, mockTransactions), [])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Visão geral das suas finanças em agosto de 2026." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Saldo disponível" value={formatCurrency(summary.availableBalance)} icon={Wallet} tone="neutral" />
            <StatCard label="Receitas do mês" value={formatCurrency(summary.totalIncome)} icon={TrendingUp} tone="success" />
            <StatCard label="Despesas do mês" value={formatCurrency(summary.totalExpenses)} icon={TrendingDown} tone="danger" />
            <StatCard
              label="Economia do mês"
              value={formatCurrency(summary.netSavings)}
              icon={PiggyBank}
              tone={summary.netSavings >= 0 ? 'success' : 'danger'}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Receitas x despesas</CardTitle>
          </CardHeader>
          <CardContent>{loading ? <ChartSkeleton /> : <FinancialChart data={dailySeries} />}</CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>{loading ? <ChartSkeleton /> : <CategoryChart data={categoryExpenses} />}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Últimas transações</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <TableSkeleton rows={6} /> : <TransactionTable transactions={recentTransactions} compact />}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Saldo por conta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {loading
              ? [1, 2, 3].map((i) => <StatCardSkeleton key={i} />)
              : accountsBalance.map((ab) => {
                  const account = mockAccounts.find((a) => a.id === ab.accountId)
                  if (!account) return null
                  return <AccountCard key={ab.accountId} account={account} balance={ab.balance} />
                })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
