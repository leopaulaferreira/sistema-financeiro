import { useState } from 'react'
import { Plus, Target } from 'lucide-react'
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
import { GoalCard } from '@/features/goals/components/goal-card'
import { GoalFormDialog } from '@/features/goals/components/goal-form-dialog'
import { GoalContributionsSheet } from '@/features/goals/components/goal-contributions-sheet'
import { useDeleteGoal, useGoalsQuery } from '@/features/goals/hooks/use-goals'
import { friendlyErrorMessage } from '@/services/api-error'
import type { FinancialGoal } from '@/types/finance'

export function GoalsPage() {
  const { data: goals, isPending, isError, error, refetch } = useGoalsQuery()
  const deleteGoal = useDeleteGoal()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FinancialGoal | undefined>(undefined)
  const [deleting, setDeleting] = useState<FinancialGoal | undefined>(undefined)
  const [managing, setManaging] = useState<FinancialGoal | undefined>(undefined)
  const [contributionsOpen, setContributionsOpen] = useState(false)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(goal: FinancialGoal) {
    setEditing(goal)
    setFormOpen(true)
  }

  function openContributions(goal: FinancialGoal) {
    setManaging(goal)
    setContributionsOpen(true)
  }

  function handleDelete() {
    if (!deleting) return
    deleteGoal.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Meta excluída.', { description: deleting.name })
        setDeleting(undefined)
      },
      onError: (err) => {
        toast.error('Não foi possível excluir a meta.', { description: friendlyErrorMessage(err) })
        setDeleting(undefined)
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Metas"
        description="Acompanhe o progresso das suas metas financeiras."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nova meta
          </Button>
        }
      />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Não foi possível carregar as metas" />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta cadastrada"
          description="Defina um objetivo financeiro, como uma reserva de emergência ou uma viagem, e acompanhe o progresso."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nova meta
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => openEdit(goal)}
              onDelete={() => setDeleting(goal)}
              onManageContributions={() => openContributions(goal)}
            />
          ))}
        </div>
      )}

      <GoalFormDialog open={formOpen} onOpenChange={setFormOpen} goal={editing} />
      <GoalContributionsSheet open={contributionsOpen} onOpenChange={setContributionsOpen} goal={managing} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a meta "{deleting?.name}" e todo o histórico de contribuições dela, permanentemente.
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
