import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/common/pagination'
import { TableSkeleton } from '@/components/common/loading-skeleton'
import { TransactionFilters } from '@/features/transactions/components/transaction-filters'
import {
  defaultTransactionFilters,
  type TransactionFiltersState,
} from '@/features/transactions/components/transaction-filters.types'
import { TransactionTable } from '@/features/transactions/components/transaction-table'
import { TransactionFormDialog } from '@/features/transactions/components/transaction-form-dialog'
import { mockTransactions, sortedByDateDesc } from '@/mocks'
import { useMockLoading } from '@/hooks/use-mock-loading'

const PAGE_SIZE = 10

export function TransactionsPage() {
  const loading = useMockLoading()
  const [filters, setFilters] = useState<TransactionFiltersState>(defaultTransactionFilters)
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)

  const filtered = useMemo(() => {
    const all = sortedByDateDesc(mockTransactions)
    return all.filter((t) => {
      if (filters.period !== 'ALL' && !t.date.startsWith(filters.period)) return false
      if (filters.type !== 'ALL' && t.type !== filters.type) return false
      if (filters.categoryId !== 'ALL' && t.categoryId !== filters.categoryId) return false
      if (filters.accountId !== 'ALL' && t.accountId !== filters.accountId) return false
      return true
    })
  }, [filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleFiltersChange(next: TransactionFiltersState) {
    setFilters(next)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transações"
        description="Todas as suas receitas e despesas em um só lugar."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Nova transação
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <TransactionFilters value={filters} onChange={handleFiltersChange} />

          {loading ? (
            <TableSkeleton rows={8} />
          ) : (
            <>
              <TransactionTable transactions={pageItems} />
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <TransactionFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
