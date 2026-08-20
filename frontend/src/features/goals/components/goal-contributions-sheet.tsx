import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddContribution, useGoalContributionsQuery, useRemoveContribution } from '../hooks/use-goals'
import { formatCurrency, formatDate } from '@/lib/format'
import { friendlyErrorMessage } from '@/services/api-error'
import type { FinancialGoal } from '@/types/finance'

interface GoalContributionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: FinancialGoal
}

export function GoalContributionsSheet({ open, onOpenChange, goal }: GoalContributionsSheetProps) {
  const goalId = goal?.id ?? 0
  const { data: contributions, isPending } = useGoalContributionsQuery(goalId, open && !!goal)
  const addContribution = useAddContribution()
  const removeContribution = useRemoveContribution()

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function resetForm() {
    setAmount('')
    setDate(new Date().toISOString().slice(0, 10))
    setNote('')
    setError('')
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amountNumber = Number(amount.replace(',', '.'))
    if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError('Informe um valor válido maior que zero.')
      return
    }
    if (!date) {
      setError('Informe a data da contribuição.')
      return
    }

    addContribution.mutate(
      { goalId, data: { amount: amountNumber, date, note: note.trim() || null } },
      {
        onSuccess: () => {
          toast.success('Contribuição adicionada.')
          resetForm()
        },
        onError: (err) => setError(friendlyErrorMessage(err)),
      },
    )
  }

  function handleRemove(contributionId: number) {
    removeContribution.mutate(
      { goalId, contributionId },
      {
        onSuccess: () => toast.success('Contribuição removida.'),
        onError: (err) => toast.error('Não foi possível remover a contribuição.', { description: friendlyErrorMessage(err) }),
      },
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm()
        onOpenChange(next)
      }}
    >
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Contribuições · {goal?.name}</SheetTitle>
          <SheetDescription>Registre valores acumulados para esta meta. Nenhuma transação é criada.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
          <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contribution-amount">Valor</Label>
                <Input id="contribution-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contribution-date">Data</Label>
                <Input id="contribution-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contribution-note">Observação (opcional)</Label>
              <Input id="contribution-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: 13º salário" />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button type="submit" size="sm" className="w-fit self-end" disabled={addContribution.isPending}>
              {addContribution.isPending && <Loader2 className="size-4 animate-spin" />}
              Adicionar
            </Button>
          </form>

          <div className="flex flex-col gap-2">
            {isPending ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : contributions && contributions.length > 0 ? (
              contributions.map((contribution) => (
                <div key={contribution.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(contribution.amount)}</span>
                    <span className="truncate text-xs text-text-secondary">
                      {formatDate(contribution.date)}
                      {contribution.note && ` · ${contribution.note}`}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-text-secondary hover:text-danger"
                    onClick={() => handleRemove(contribution.id)}
                    aria-label="Remover contribuição"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-text-secondary">Nenhuma contribuição registrada ainda.</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
