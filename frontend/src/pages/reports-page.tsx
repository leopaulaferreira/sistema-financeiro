import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDownToLine, Coins, Hash, TrendingDown, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/common/loading-skeleton'
import { ErrorState } from '@/components/common/error-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ReportPeriodPicker } from '@/features/reports/components/report-period-picker'
import { IncomeExpenseSeriesChart } from '@/features/reports/components/income-expense-series-chart'
import { CategoryReportList } from '@/features/reports/components/category-report-list'
import { AccountFlowTable } from '@/features/reports/components/account-flow-table'
import { BalanceEvolutionChart } from '@/features/reports/components/balance-evolution-chart'
import { MonthlyComparisonChart } from '@/features/reports/components/monthly-comparison-chart'
import { PaymentMethodsList } from '@/features/reports/components/payment-methods-list'
import { TransactionTable } from '@/features/transactions/components/transaction-table'
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories'
import {
  useAccountsFlow,
  useBalanceEvolution,
  useExpensesByCategoryReport,
  useIncomeByCategoryReport,
  useIncomeVsExpense,
  useMonthlyComparison,
  usePaymentMethodsReport,
  useReportSummary,
  useTopExpenses,
  useTopIncome,
} from '@/features/reports/hooks/use-reports'
import { currentMonthRange, toReportRange } from '@/lib/date-range'
import { formatCurrency } from '@/lib/format'
import { reportsService } from '@/services/reports-service'
import { friendlyErrorMessage } from '@/services/api-error'
import type { ReportGranularity } from '@/types/finance'

export function ReportsPage() {
  const [range, setRange] = useState(() => currentMonthRange())
  const [granularity, setGranularity] = useState<ReportGranularity>('DAY')
  const [months, setMonths] = useState(6)
  const [exporting, setExporting] = useState(false)

  const apiRange = useMemo(() => toReportRange(range.from, range.to), [range])

  const summary = useReportSummary(apiRange)
  const series = useIncomeVsExpense({ ...apiRange, granularity })
  const expensesByCategory = useExpensesByCategoryReport(apiRange)
  const incomeByCategory = useIncomeByCategoryReport(apiRange)
  const accountsFlow = useAccountsFlow(apiRange)
  const balanceEvolution = useBalanceEvolution(apiRange)
  const monthlyComparison = useMonthlyComparison(months)
  const topExpenses = useTopExpenses({ ...apiRange, limit: 5 })
  const topIncome = useTopIncome({ ...apiRange, limit: 5 })
  const paymentMethods = usePaymentMethodsReport(apiRange)
  const categories = useCategoriesQuery()

  const colorByCategoryId = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.color])),
    [categories.data],
  )

  async function handleExportCsv() {
    setExporting(true)
    try {
      const blob = await reportsService.exportCsv(apiRange)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'relatorio-transacoes.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Não foi possível exportar o CSV.', { description: friendlyErrorMessage(error) })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatórios"
        description="Analise receitas, despesas e tendências financeiras num período customizado."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportPeriodPicker
              from={range.from}
              toInclusive={range.to}
              onChange={(r) => setRange({ from: r.from, to: r.toInclusive })}
            />
            <Button variant="outline" className="border-border" onClick={handleExportCsv} disabled={exporting}>
              <ArrowDownToLine className="size-4" />
              Exportar CSV
            </Button>
          </div>
        }
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
            <StatCard label="Receitas" value={formatCurrency(summary.data.totalIncome)} icon={TrendingUp} tone="success" />
            <StatCard label="Despesas" value={formatCurrency(summary.data.totalExpenses)} icon={TrendingDown} tone="danger" />
            <StatCard
              label="Resultado líquido"
              value={formatCurrency(summary.data.netResult)}
              icon={Coins}
              tone={summary.data.netResult >= 0 ? 'success' : 'danger'}
            />
            <StatCard
              label="Lançamentos"
              value={String(summary.data.transactionCount)}
              icon={Hash}
              hint={`Ticket médio: ${formatCurrency(summary.data.averageIncome)} receita · ${formatCurrency(summary.data.averageExpense)} despesa`}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Receitas x despesas</CardTitle>
          <Select value={granularity} onValueChange={(v) => setGranularity(v as ReportGranularity)}>
            <SelectTrigger className="w-32 border-border bg-surface" aria-label="Granularidade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAY">Diário</SelectItem>
              <SelectItem value="MONTH">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {series.isPending ? (
            <ChartSkeleton />
          ) : series.isError ? (
            <ErrorState error={series.error} onRetry={() => series.refetch()} />
          ) : (
            <IncomeExpenseSeriesChart data={series.data} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.isPending ? (
              <ChartSkeleton height={200} />
            ) : expensesByCategory.isError ? (
              <ErrorState error={expensesByCategory.error} onRetry={() => expensesByCategory.refetch()} />
            ) : (
              <CategoryReportList
                data={expensesByCategory.data}
                colorByCategoryId={colorByCategoryId}
                variant="danger"
                emptyMessage="Nenhuma despesa no período"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receitas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeByCategory.isPending ? (
              <ChartSkeleton height={200} />
            ) : incomeByCategory.isError ? (
              <ErrorState error={incomeByCategory.error} onRetry={() => incomeByCategory.refetch()} />
            ) : (
              <CategoryReportList
                data={incomeByCategory.data}
                colorByCategoryId={colorByCategoryId}
                variant="success"
                emptyMessage="Nenhuma receita no período"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Fluxo por conta</CardTitle>
          </CardHeader>
          <CardContent>
            {accountsFlow.isPending ? (
              <TableSkeleton rows={4} />
            ) : accountsFlow.isError ? (
              <ErrorState error={accountsFlow.error} onRetry={() => accountsFlow.refetch()} />
            ) : (
              <AccountFlowTable data={accountsFlow.data} />
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Evolução de saldo</CardTitle>
          </CardHeader>
          <CardContent>
            {balanceEvolution.isPending ? (
              <ChartSkeleton height={200} />
            ) : balanceEvolution.isError ? (
              <ErrorState error={balanceEvolution.error} onRetry={() => balanceEvolution.refetch()} />
            ) : (
              <BalanceEvolutionChart data={balanceEvolution.data} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Comparativo mensal</CardTitle>
          <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
            <SelectTrigger className="w-36 border-border bg-surface" aria-label="Período do comparativo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {monthlyComparison.isPending ? (
            <ChartSkeleton />
          ) : monthlyComparison.isError ? (
            <ErrorState error={monthlyComparison.error} onRetry={() => monthlyComparison.refetch()} />
          ) : (
            <MonthlyComparisonChart data={monthlyComparison.data} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Maiores despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {topExpenses.isPending ? (
              <TableSkeleton rows={5} />
            ) : topExpenses.isError ? (
              <ErrorState error={topExpenses.error} onRetry={() => topExpenses.refetch()} />
            ) : (
              <TransactionTable transactions={topExpenses.data} compact />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maiores receitas</CardTitle>
          </CardHeader>
          <CardContent>
            {topIncome.isPending ? (
              <TableSkeleton rows={5} />
            ) : topIncome.isError ? (
              <ErrorState error={topIncome.error} onRetry={() => topIncome.refetch()} />
            ) : (
              <TransactionTable transactions={topIncome.data} compact />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Métodos de pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentMethods.isPending ? (
            <TableSkeleton rows={3} />
          ) : paymentMethods.isError ? (
            <ErrorState error={paymentMethods.error} onRetry={() => paymentMethods.refetch()} />
          ) : (
            <PaymentMethodsList data={paymentMethods.data} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
