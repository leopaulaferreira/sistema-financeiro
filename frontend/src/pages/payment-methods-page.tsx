import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TableSkeleton } from '@/components/common/loading-skeleton'
import { ErrorState } from '@/components/common/error-state'
import { PaymentMethodList } from '@/features/payment-methods/components/payment-method-list'
import { PaymentMethodFormDialog } from '@/features/payment-methods/components/payment-method-form-dialog'
import { usePaymentMethodsQuery, useDeletePaymentMethod } from '@/features/payment-methods/hooks/use-payment-methods'
import { friendlyErrorMessage } from '@/services/api-error'
import type { PaymentMethod } from '@/types/finance'

export function PaymentMethodsPage() {
  const { data: paymentMethods, isPending, isError, error, refetch } = usePaymentMethodsQuery()
  const deletePaymentMethod = useDeletePaymentMethod()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentMethod | undefined>(undefined)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(paymentMethod: PaymentMethod) {
    setEditing(paymentMethod)
    setFormOpen(true)
  }

  function handleDelete(paymentMethod: PaymentMethod) {
    deletePaymentMethod.mutate(paymentMethod.id, {
      onSuccess: () => toast.success('Método de pagamento excluído.', { description: paymentMethod.name }),
      onError: (err) =>
        toast.error('Não foi possível excluir o método de pagamento.', { description: friendlyErrorMessage(err) }),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Métodos de pagamento"
        description="Cadastre as formas de pagamento usadas para registrar suas transações."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Novo método
          </Button>
        }
      />

      <Card>
        <CardContent>
          {isPending ? (
            <TableSkeleton rows={5} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} title="Não foi possível carregar os métodos de pagamento" />
          ) : (
            <PaymentMethodList paymentMethods={paymentMethods} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </CardContent>
      </Card>

      <PaymentMethodFormDialog open={formOpen} onOpenChange={setFormOpen} paymentMethod={editing} />
    </div>
  )
}
