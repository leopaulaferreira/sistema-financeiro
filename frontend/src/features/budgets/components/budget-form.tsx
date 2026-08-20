import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { useCreateBudget, useUpdateBudget } from '../hooks/use-budgets'
import { ApiClientError, friendlyErrorMessage } from '@/services/api-error'
import type { Budget } from '@/types/finance'
import type { BudgetCreateRequest, BudgetUpdateRequest } from '@/types/requests'

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface FormState {
  categoryId: string
  amount: string
  year: number
  month: number
}

function emptyForm(year: number, month: number): FormState {
  return { categoryId: '', amount: '', year, month }
}

function formFromBudget(budget: Budget): FormState {
  return { categoryId: String(budget.category.id), amount: String(budget.amount), year: budget.year, month: budget.month }
}

type FieldErrors = Partial<Record<'categoryId' | 'amount', string>>

interface BudgetFormProps {
  budget?: Budget
  defaultYear: number
  defaultMonth: number
  onSuccess: () => void
  onCancel: () => void
}

export function BudgetForm({ budget, defaultYear, defaultMonth, onSuccess, onCancel }: BudgetFormProps) {
  const [form, setForm] = useState<FormState>(() => (budget ? formFromBudget(budget) : emptyForm(defaultYear, defaultMonth)))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')

  const { data: categories, isLoading: loadingCategories } = useCategoriesQuery('EXPENSE')
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const submitting = createBudget.isPending || updateBudget.isPending

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const amountNumber = Number(form.amount.replace(',', '.'))
    const errors: FieldErrors = {}
    if (!form.categoryId) errors.categoryId = 'Selecione uma categoria.'
    if (!form.amount || Number.isNaN(amountNumber) || amountNumber <= 0) errors.amount = 'Informe um valor válido maior que zero.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    const payload = {
      categoryId: Number(form.categoryId),
      year: form.year,
      month: form.month,
      amount: amountNumber,
    } satisfies BudgetCreateRequest | BudgetUpdateRequest

    const mutation = budget
      ? updateBudget.mutateAsync({ id: budget.id, data: payload })
      : createBudget.mutateAsync(payload)

    mutation
      .then(() => {
        toast.success(budget ? 'Orçamento atualizado.' : 'Orçamento cadastrado.')
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

  if (loadingCategories) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  if ((categories ?? []).length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary">
        Antes de cadastrar um orçamento, crie ao menos uma categoria de despesa.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Categoria" htmlFor="budget-category" error={fieldErrors.categoryId}>
        <Select value={form.categoryId} onValueChange={(v) => update('categoryId', v)}>
          <SelectTrigger id="budget-category" className="w-full" aria-invalid={!!fieldErrors.categoryId}>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Valor limite" htmlFor="budget-amount" error={fieldErrors.amount}>
        <Input
          id="budget-amount"
          inputMode="decimal"
          value={form.amount}
          onChange={(e) => update('amount', e.target.value)}
          placeholder="0,00"
          aria-invalid={!!fieldErrors.amount}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Mês" htmlFor="budget-month">
          <Select value={String(form.month)} onValueChange={(v) => update('month', Number(v))}>
            <SelectTrigger id="budget-month" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, i) => (
                <SelectItem key={label} value={String(i + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Ano" htmlFor="budget-year">
          <Select value={String(form.year)} onValueChange={(v) => update('year', Number(v))}>
            <SelectTrigger id="budget-year" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => defaultYear - i).map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {formError && <p className="text-xs text-danger">{formError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Salvar orçamento
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
