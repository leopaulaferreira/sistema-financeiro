import { useState } from 'react'
import { PiggyBank, Plus, TrendingDown, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { StatCard } from '@/components/common/stat-card'
import { StatCardSkeleton } from '@/components/common/loading-skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PeriodSelector } from '@/features/dashboard/components/period-selector'
import { BudgetCard } from '@/features/budgets/components/budget-card'
import { BudgetFormDialog } from '@/features/budgets/components/budget-form-dialog'
import { useBudgetsQuery, useDeleteBudget } from '@/features/budgets/hooks/use-budgets'
import { formatCurrency } from '@/lib/format'
import { friendlyErrorMessage } from '@/services/api-error'
import type { DashboardPeriod } from '@/services/dashboard-service'
import type { Budget } from '@/types/finance'

export function BudgetsPage() {
  const [period, setPeriod] = useState<DashboardPeriod>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  const { data: budgets, isPending, isError, error, refetch } = useBudgetsQuery(period)
  const deleteBudget = useDeleteBudget()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | undefined>(undefined)
  const [deleting, setDeleting] = useState<Budget | undefined>(undefined)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(budget: Budget) {
    setEditing(budget)
    setFormOpen(true)
  }

  function handleDelete() {
    if (!deleting) return
    deleteBudget.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Orçamento excluído.', { description: deleting.category.name })
        setDeleting(undefined)
      },
      onError: (err) => {
        toast.error('Não foi possível excluir o orçamento.', { description: friendlyErrorMessage(err) })
        setDeleting(undefined)
      },
    })
  }

  const totals = (budgets ?? []).reduce(
    (acc, b) => ({ amount: acc.amount + b.amount, spent: acc.spent + b.spent }),
    { amount: 0, spent: 0 },
  )
  const totalRemaining = totals.amount - totals.spent

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orçamentos"
        description="Defina limites de gasto por categoria e acompanhe o quanto já foi consumido no mês."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelector value={period} onChange={setPeriod} />
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Novo orçamento
            </Button>
          </div>
        }
      />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Não foi possível carregar os orçamentos" />
      ) : (
        <>
          {budgets.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Total orçado" value={formatCurrency(totals.amount)} icon={PiggyBank} />
              <StatCard label="Total gasto" value={formatCurrency(totals.spent)} icon={TrendingDown} tone="danger" />
              <StatCard
                label="Total restante"
                value={formatCurrency(totalRemaining)}
                icon={Wallet}
                tone={totalRemaining >= 0 ? 'success' : 'danger'}
              />
            </div>
          )}

          {budgets.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title="Nenhum orçamento neste período"
              description="Defina quanto pretende gastar em cada categoria de despesa e acompanhe o consumo mês a mês."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Novo orçamento
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {budgets.map((budget) => (
                <BudgetCard key={budget.id} budget={budget} onEdit={() => openEdit(budget)} onDelete={() => setDeleting(budget)} />
              ))}
            </div>
          )}
        </>
      )}

      <BudgetFormDialog open={formOpen} onOpenChange={setFormOpen} budget={editing} defaultYear={period.year} defaultMonth={period.month} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o orçamento de "{deleting?.category.name}" para este período. As transações continuam intactas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-danger text-danger-foreground hover:bg-danger/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
