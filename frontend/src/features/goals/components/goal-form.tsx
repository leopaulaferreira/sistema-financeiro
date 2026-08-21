import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateGoal, useUpdateGoal } from '../hooks/use-goals'
import { ApiClientError, friendlyErrorMessage } from '@/services/api-error'
import type { FinancialGoal, GoalStatus } from '@/types/finance'
import type { FinancialGoalCreateRequest, FinancialGoalUpdateRequest } from '@/types/requests'

interface FormState {
  name: string
  description: string
  targetAmount: string
  targetDate: string
  status: Exclude<GoalStatus, 'COMPLETED'>
}

function emptyForm(): FormState {
  return { name: '', description: '', targetAmount: '', targetDate: '', status: 'ACTIVE' }
}

function formFromGoal(goal: FinancialGoal): FormState {
  return {
    name: goal.name,
    description: goal.description ?? '',
    targetAmount: String(goal.targetAmount),
    targetDate: goal.targetDate ?? '',
    // COMPLETED nunca é aceito pelo PUT (é sempre derivado automaticamente pelo backend a
    // partir das contribuições) — ao editar uma meta já concluída, o formulário parte de
    // ACTIVE, que o backend recalcula de volta para COMPLETED se o total ainda for suficiente.
    status: goal.status === 'COMPLETED' ? 'ACTIVE' : goal.status,
  }
}

type FieldErrors = Partial<Record<'name' | 'targetAmount' | 'targetDate', string>>

interface GoalFormProps {
  goal?: FinancialGoal
  onSuccess: () => void
  onCancel: () => void
}

export function GoalForm({ goal, onSuccess, onCancel }: GoalFormProps) {
  const [form, setForm] = useState<FormState>(() => (goal ? formFromGoal(goal) : emptyForm()))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')

  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const submitting = createGoal.isPending || updateGoal.isPending

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const targetAmountNumber = Number(form.targetAmount.replace(',', '.'))
    const errors: FieldErrors = {}
    if (!form.name.trim()) errors.name = 'Informe um nome.'
    if (!form.targetAmount || Number.isNaN(targetAmountNumber) || targetAmountNumber <= 0) {
      errors.targetAmount = 'Informe um valor válido maior que zero.'
    }
    const today = new Date().toISOString().slice(0, 10)
    if (form.targetDate && form.targetDate < today) errors.targetDate = 'Data alvo não pode ser anterior a hoje.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    const targetDate = form.targetDate.trim() || null

    const mutation = goal
      ? updateGoal.mutateAsync({
          id: goal.id,
          data: {
            name: form.name.trim(),
            description: form.description.trim() || null,
            targetAmount: targetAmountNumber,
            targetDate,
            status: form.status,
          } satisfies FinancialGoalUpdateRequest,
        })
      : createGoal.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim() || null,
          targetAmount: targetAmountNumber,
          targetDate,
        } satisfies FinancialGoalCreateRequest)

    mutation
      .then(() => {
        toast.success(goal ? 'Meta atualizada.' : 'Meta cadastrada.', { description: form.name.trim() })
        onSuccess()
      })
      .catch((error: unknown) => {
        if (error instanceof ApiClientError && error.errors.length > 0) {
          const next: FieldErrors = {}
          for (const fe of error.errors) {
            if (fe.field in form) next[fe.field as keyof FieldErrors] = fe.message
          }
          setFieldErrors(next)
        }
        setFormError(friendlyErrorMessage(error))
      })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Nome" htmlFor="goal-name" error={fieldErrors.name}>
        <Input
          id="goal-name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Ex.: Reserva de emergência"
          aria-invalid={!!fieldErrors.name}
        />
      </Field>

      <Field label="Descrição (opcional)" htmlFor="goal-description">
        <Textarea
          id="goal-description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Um lembrete sobre por que essa meta importa"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor alvo" htmlFor="goal-target-amount" error={fieldErrors.targetAmount}>
          <Input
            id="goal-target-amount"
            inputMode="decimal"
            value={form.targetAmount}
            onChange={(e) => update('targetAmount', e.target.value)}
            placeholder="0,00"
            aria-invalid={!!fieldErrors.targetAmount}
          />
        </Field>
        <Field label="Data alvo (opcional)" htmlFor="goal-target-date" error={fieldErrors.targetDate}>
          <Input
            id="goal-target-date"
            type="date"
            value={form.targetDate}
            onChange={(e) => update('targetDate', e.target.value)}
            aria-invalid={!!fieldErrors.targetDate}
          />
        </Field>
      </div>

      {goal && (
        <Field label="Status" htmlFor="goal-status">
          <Select value={form.status} onValueChange={(v) => update('status', v as FormState['status'])}>
            <SelectTrigger id="goal-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Em andamento</SelectItem>
              <SelectItem value="CANCELLED">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          {goal.status === 'COMPLETED' && (
            <p className="text-xs text-text-secondary">
              Esta meta já foi concluída. Deixando "Em andamento", ela continua concluída automaticamente.
            </p>
          )}
        </Field>
      )}

      {formError && <p className="text-xs text-danger">{formError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Salvar meta
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
