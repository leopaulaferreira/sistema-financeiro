import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { RecurringTransactionForm } from './recurring-transaction-form'
import type { RecurringTransaction } from '@/types/finance'

interface RecurringTransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recurring?: RecurringTransaction
}

export function RecurringTransactionFormDialog({ open, onOpenChange, recurring }: RecurringTransactionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{recurring ? 'Editar recorrência' : 'Nova recorrência'}</DialogTitle>
          <DialogDescription>
            {recurring
              ? 'Atualize os dados da recorrência. Transações já geradas não são alteradas.'
              : 'Cadastre uma receita ou despesa que se repete automaticamente.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RecurringTransactionForm
            key={recurring?.id ?? 'new'}
            recurring={recurring}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
