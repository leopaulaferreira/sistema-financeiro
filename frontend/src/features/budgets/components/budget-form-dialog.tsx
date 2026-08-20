import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BudgetForm } from './budget-form'
import type { Budget } from '@/types/finance'

interface BudgetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget?: Budget
  defaultYear: number
  defaultMonth: number
}

export function BudgetFormDialog({ open, onOpenChange, budget, defaultYear, defaultMonth }: BudgetFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? 'Editar orçamento' : 'Novo orçamento'}</DialogTitle>
          <DialogDescription>
            {budget
              ? 'Atualize o limite ou o período deste orçamento.'
              : 'Defina quanto pretende gastar em uma categoria durante o mês.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <BudgetForm
            key={budget?.id ?? 'new'}
            budget={budget}
            defaultYear={defaultYear}
            defaultMonth={defaultMonth}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
