import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/common/pagination'
import { TableSkeleton } from '@/components/common/loading-skeleton'
import { ErrorState } from '@/components/common/error-state'
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
import { TransactionFilters } from '@/features/transactions/components/transaction-filters'
import {
  defaultTransactionFilters,
  type TransactionFiltersState,
} from '@/features/transactions/components/transaction-filters.types'
import { TransactionTable } from '@/features/transactions/components/transaction-table'
import { TransactionFormDialog } from '@/features/transactions/components/transaction-form-dialog'
import { useDeleteTransaction, useTransactionsQuery } from '@/features/transactions/hooks/use-transactions'
import { currentMonthRange, previousMonthRange } from '@/lib/date-range'
import { friendlyErrorMessage } from '@/services/api-error'
import type { Transaction } from '@/types/finance'
import type { TransactionSearchParams } from '@/types/requests'

const PAGE_SIZE = 10

export function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFiltersState>(defaultTransactionFilters)
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>(undefined)
  const [deleting, setDeleting] = useState<Transaction | undefined>(undefined)

  const searchParams = useMemo<TransactionSearchParams>(() => {
    const range = filters.period === 'CURRENT' ? currentMonthRange() : filters.period === 'PREVIOUS' ? previousMonthRange() : null
    return {
      from: range?.from,
      to: range?.to,
      type: filters.type === 'ALL' ? undefined : filters.type,
      categoryId: filters.categoryId === 'ALL' ? undefined : Number(filters.categoryId),
      accountId: filters.accountId === 'ALL' ? undefined : Number(filters.accountId),
      page,
      size: PAGE_SIZE,
    }
  }, [filters, page])

  const { data, isPending, isError, error, refetch, isFetching } = useTransactionsQuery(searchParams)
  const deleteTransaction = useDeleteTransaction()

  function handleFiltersChange(next: TransactionFiltersState) {
    setFilters(next)
    setPage(0)
  }

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction)
    setFormOpen(true)
  }

  function handleDelete() {
    if (!deleting) return
    deleteTransaction.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Transação excluída.', { description: deleting.description })
        setDeleting(undefined)
      },
      onError: (err) => {
        toast.error('Não foi possível excluir a transação.', { description: friendlyErrorMessage(err) })
        setDeleting(undefined)
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transações"
        description="Todas as suas receitas e despesas em um só lugar."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nova transação
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <TransactionFilters value={filters} onChange={handleFiltersChange} />

          {isPending ? (
            <TableSkeleton rows={8} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} title="Não foi possível carregar as transações" />
          ) : (
            <>
              <TransactionTable
                transactions={data.content}
                onEdit={openEdit}
                onDelete={setDeleting}
              />
              <Pagination page={data.page + 1} totalPages={data.totalPages} onPageChange={(p) => setPage(p - 1)} />
              {isFetching && <p className="text-xs text-text-secondary">Atualizando...</p>}
            </>
          )}
        </CardContent>
      </Card>

      <TransactionFormDialog open={formOpen} onOpenChange={setFormOpen} transaction={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove "{deleting?.description}" permanentemente e não pode ser desfeita.
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
