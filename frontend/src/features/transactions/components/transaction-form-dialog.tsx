import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { TransactionForm } from './transaction-form'

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransactionFormDialog({ open, onOpenChange }: TransactionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova transação</DialogTitle>
          <DialogDescription>Cadastre uma receita ou despesa. Os dados ainda não são enviados ao servidor.</DialogDescription>
        </DialogHeader>
        <TransactionForm onSuccess={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
