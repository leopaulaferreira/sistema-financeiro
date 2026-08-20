import { useState } from 'react'
import { Plus, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
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
import { RecurringTransactionCard } from '@/features/recurring/components/recurring-transaction-card'
import { RecurringTransactionFormDialog } from '@/features/recurring/components/recurring-transaction-form-dialog'
import {
  useDeleteRecurringTransaction,
  useRecurringTransactionsQuery,
  useUpdateRecurringTransaction,
} from '@/features/recurring/hooks/use-recurring-transactions'
import { friendlyErrorMessage } from '@/services/api-error'
import type { RecurringTransaction } from '@/types/finance'

export function RecurringPage() {
  const { data: recurringTransactions, isPending, isError, error, refetch } = useRecurringTransactionsQuery()
  const updateRecurring = useUpdateRecurringTransaction()
  const deleteRecurring = useDeleteRecurringTransaction()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTransaction | undefined>(undefined)
  const [deleting, setDeleting] = useState<RecurringTransaction | undefined>(undefined)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(recurring: RecurringTransaction) {
    setEditing(recurring)
    setFormOpen(true)
  }

  function handleToggleActive(recurring: RecurringTransaction) {
    updateRecurring.mutate(
      {
        id: recurring.id,
        data: {
          description: recurring.description,
          amount: recurring.amount,
          categoryId: recurring.category.id,
          accountId: recurring.account.id,
          paymentMethodId: recurring.paymentMethod.id,
          frequency: recurring.frequency,
          startDate: recurring.startDate,
          endDate: recurring.endDate,
          active: !recurring.active,
        },
      },
      {
        onSuccess: () => toast.success(recurring.active ? 'Recorrência pausada.' : 'Recorrência ativada.', { description: recurring.description }),
        onError: (err) => toast.error('Não foi possível atualizar a recorrência.', { description: friendlyErrorMessage(err) }),
      },
    )
  }

  function handleDelete() {
    if (!deleting) return
    deleteRecurring.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Recorrência excluída.', { description: deleting.description })
        setDeleting(undefined)
      },
      onError: (err) => {
        toast.error('Não foi possível excluir a recorrência.', { description: friendlyErrorMessage(err) })
        setDeleting(undefined)
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recorrências"
        description="Receitas e despesas que se repetem automaticamente, como salário, aluguel e assinaturas."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nova recorrência
          </Button>
        }
      />

      {isPending ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Não foi possível carregar as recorrências" />
      ) : recurringTransactions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Nenhuma recorrência cadastrada"
          description="Cadastre receitas e despesas que se repetem, como salário, aluguel ou assinaturas."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nova recorrência
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {recurringTransactions.map((recurring) => (
            <RecurringTransactionCard
              key={recurring.id}
              recurring={recurring}
              onEdit={() => openEdit(recurring)}
              onToggleActive={() => handleToggleActive(recurring)}
              onDelete={() => setDeleting(recurring)}
            />
          ))}
        </div>
      )}

      <RecurringTransactionFormDialog open={formOpen} onOpenChange={setFormOpen} recurring={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a regra "{deleting?.description}" permanentemente. As transações já geradas por ela
              continuam no seu histórico.
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
