import { useMemo, useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Wallet as WalletIcon } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/common/loading-skeleton'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FinancialChart } from '@/features/dashboard/components/financial-chart'
import { CategoryChart } from '@/features/dashboard/components/category-chart'
import { PeriodSelector } from '@/features/dashboard/components/period-selector'
import { TransactionTable } from '@/features/transactions/components/transaction-table'
import { AccountCard } from '@/features/accounts/components/account-card'
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { useAccountsQuery } from '@/features/accounts/hooks/use-accounts'
import {
  useAccountsBalance,
  useDashboardSummary,
  useExpensesByCategory,
  useIncomeVsExpense,
  useRecentTransactions,
} from '@/features/dashboard/hooks/use-dashboard'
import { formatCurrency } from '@/lib/format'
import type { DashboardPeriod } from '@/services/dashboard-service'

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  const summary = useDashboardSummary(period)
  const categoryExpenses = useExpensesByCategory(period)
  const dailySeries = useIncomeVsExpense(period)
  const recentTransactions = useRecentTransactions(8)
  const accountsBalance = useAccountsBalance()
  const categories = useCategoriesQuery()
  const accounts = useAccountsQuery()

  const colorByCategoryId = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.color])),
    [categories.data],
  )
  const accountByAccountId = useMemo(() => new Map((accounts.data ?? []).map((a) => [a.id, a])), [accounts.data])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral das suas finanças."
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isPending ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : summary.isError ? (
          <div className="sm:col-span-2 xl:col-span-4">
            <ErrorState error={summary.error} onRetry={() => summary.refetch()} title="Não foi possível carregar o resumo" />
          </div>
        ) : (
          <>
            <StatCard label="Saldo disponível" value={formatCurrency(summary.data.availableBalance)} icon={Wallet} tone="neutral" />
            <StatCard label="Receitas do mês" value={formatCurrency(summary.data.totalIncome)} icon={TrendingUp} tone="success" />
            <StatCard label="Despesas do mês" value={formatCurrency(summary.data.totalExpenses)} icon={TrendingDown} tone="danger" />
            <StatCard
              label="Economia do mês"
              value={formatCurrency(summary.data.netSavings)}
              icon={PiggyBank}
              tone={summary.data.netSavings >= 0 ? 'success' : 'danger'}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Receitas x despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {dailySeries.isPending ? (
              <ChartSkeleton />
            ) : dailySeries.isError ? (
              <ErrorState error={dailySeries.error} onRetry={() => dailySeries.refetch()} />
            ) : (
              <FinancialChart data={dailySeries.data} />
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryExpenses.isPending ? (
              <ChartSkeleton />
            ) : categoryExpenses.isError ? (
              <ErrorState error={categoryExpenses.error} onRetry={() => categoryExpenses.refetch()} />
            ) : (
              <CategoryChart data={categoryExpenses.data} colorByCategoryId={colorByCategoryId} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Últimas transações</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.isPending ? (
              <TableSkeleton rows={6} />
            ) : recentTransactions.isError ? (
              <ErrorState error={recentTransactions.error} onRetry={() => recentTransactions.refetch()} />
            ) : (
              <TransactionTable transactions={recentTransactions.data} compact />
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Saldo por conta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {accountsBalance.isPending ? (
              [1, 2, 3].map((i) => <StatCardSkeleton key={i} />)
            ) : accountsBalance.isError ? (
              <ErrorState error={accountsBalance.error} onRetry={() => accountsBalance.refetch()} />
            ) : accountsBalance.data.length === 0 ? (
              <EmptyState icon={WalletIcon} title="Nenhuma conta com saldo" description="Cadastre uma conta para acompanhar o saldo aqui." />
            ) : (
              accountsBalance.data.map((ab) => (
                <AccountCard
                  key={ab.accountId}
                  name={ab.accountName}
                  type={ab.accountType}
                  balance={ab.balance}
                  active={accountByAccountId.get(ab.accountId)?.active ?? true}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
