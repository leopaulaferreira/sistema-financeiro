import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { GoalForm } from './goal-form'
import type { FinancialGoal } from '@/types/finance'

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: FinancialGoal
}

export function GoalFormDialog({ open, onOpenChange, goal }: GoalFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? 'Editar meta' : 'Nova meta'}</DialogTitle>
          <DialogDescription>
            {goal ? 'Atualize os dados da meta financeira.' : 'Defina um objetivo financeiro para acompanhar o progresso.'}
          </DialogDescription>
        </DialogHeader>
        {open && <GoalForm key={goal?.id ?? 'new'} goal={goal} onSuccess={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
