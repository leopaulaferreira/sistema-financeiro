import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { useAccountsQuery } from '@/features/accounts/hooks/use-accounts'
import { usePaymentMethodsQuery } from '@/features/payment-methods/hooks/use-payment-methods'
import { useCreateRecurringTransaction, useUpdateRecurringTransaction } from '../hooks/use-recurring-transactions'
import { frequencyLabels } from '../frequency-style'
import { ApiClientError, friendlyErrorMessage } from '@/services/api-error'
import type { RecurrenceFrequency, RecurringTransaction, TransactionType } from '@/types/finance'
import type { RecurringTransactionCreateRequest, RecurringTransactionUpdateRequest } from '@/types/requests'

interface FormState {
  type: TransactionType
  description: string
  amount: string
  categoryId: string
  accountId: string
  paymentMethodId: string
  frequency: RecurrenceFrequency
  startDate: string
  endDate: string
  active: boolean
}

function emptyForm(): FormState {
  return {
    type: 'EXPENSE',
    description: '',
    amount: '',
    categoryId: '',
    accountId: '',
    paymentMethodId: '',
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    active: true,
  }
}

function formFromRecurring(recurring: RecurringTransaction): FormState {
  return {
    type: recurring.type,
    description: recurring.description,
    amount: String(recurring.amount),
    categoryId: String(recurring.category.id),
    accountId: String(recurring.account.id),
    paymentMethodId: String(recurring.paymentMethod.id),
    frequency: recurring.frequency,
    startDate: recurring.startDate,
    endDate: recurring.endDate ?? '',
    active: recurring.active,
  }
}

type FieldErrors = Partial<Record<'description' | 'amount' | 'categoryId' | 'accountId' | 'paymentMethodId' | 'startDate' | 'endDate', string>>

interface RecurringTransactionFormProps {
  recurring?: RecurringTransaction
  onSuccess: () => void
  onCancel: () => void
}

export function RecurringTransactionForm({ recurring, onSuccess, onCancel }: RecurringTransactionFormProps) {
  const [form, setForm] = useState<FormState>(() => (recurring ? formFromRecurring(recurring) : emptyForm()))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')

  const { data: categories, isLoading: loadingCategories } = useCategoriesQuery()
  const { data: accounts, isLoading: loadingAccounts } = useAccountsQuery()
  const { data: paymentMethods, isLoading: loadingPaymentMethods } = usePaymentMethodsQuery()

  const createRecurring = useCreateRecurringTransaction()
  const updateRecurring = useUpdateRecurringTransaction()
  const submitting = createRecurring.isPending || updateRecurring.isPending
  const loadingOptions = loadingCategories || loadingAccounts || loadingPaymentMethods

  const categoriesForType = useMemo(() => (categories ?? []).filter((c) => c.type === form.type), [categories, form.type])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const amountNumber = Number(form.amount.replace(',', '.'))
    const errors: FieldErrors = {}
    if (!form.description.trim()) errors.description = 'Informe uma descrição.'
    if (!form.amount || Number.isNaN(amountNumber) || amountNumber <= 0) errors.amount = 'Informe um valor válido maior que zero.'
    if (!form.categoryId) errors.categoryId = 'Selecione uma categoria.'
    if (!form.accountId) errors.accountId = 'Selecione uma conta.'
    if (!form.paymentMethodId) errors.paymentMethodId = 'Selecione um método de pagamento.'
    if (!form.startDate) errors.startDate = 'Informe a primeira execução.'
    if (form.endDate && form.startDate && form.endDate < form.startDate) errors.endDate = 'Data final não pode ser anterior à primeira execução.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    const endDate = form.endDate.trim() || null

    const mutation = recurring
      ? updateRecurring.mutateAsync({
          id: recurring.id,
          data: {
            description: form.description.trim(),
            amount: amountNumber,
            categoryId: Number(form.categoryId),
            accountId: Number(form.accountId),
            paymentMethodId: Number(form.paymentMethodId),
            frequency: form.frequency,
            startDate: form.startDate,
            endDate,
            active: form.active,
          } satisfies RecurringTransactionUpdateRequest,
        })
      : createRecurring.mutateAsync({
          description: form.description.trim(),
          amount: amountNumber,
          type: form.type,
          categoryId: Number(form.categoryId),
          accountId: Number(form.accountId),
          paymentMethodId: Number(form.paymentMethodId),
          frequency: form.frequency,
          startDate: form.startDate,
          endDate,
        } satisfies RecurringTransactionCreateRequest)

    mutation
      .then(() => {
        toast.success(recurring ? 'Recorrência atualizada.' : 'Recorrência cadastrada.', { description: form.description.trim() })
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

  if (loadingOptions) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  const hasNoAccounts = (accounts ?? []).length === 0
  const hasNoCategories = (categories ?? []).length === 0
  const hasNoPaymentMethods = (paymentMethods ?? []).length === 0

  if (hasNoAccounts || hasNoCategories || hasNoPaymentMethods) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary">
        Antes de cadastrar uma recorrência, crie ao menos uma conta, uma categoria e um método de pagamento.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label>Tipo</Label>
        {recurring ? (
          <Badge variant="outline" className={recurring.type === 'INCOME' ? 'w-fit border-success text-success' : 'w-fit border-danger text-danger'}>
            {recurring.type === 'INCOME' ? 'Receita' : 'Despesa'}
          </Badge>
        ) : (
          <Tabs
            value={form.type}
            onValueChange={(type) => {
              update('type', type as TransactionType)
              update('categoryId', '')
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="EXPENSE" className="data-[state=active]:text-danger">
                Despesa
              </TabsTrigger>
              <TabsTrigger value="INCOME" className="data-[state=active]:text-success">
                Receita
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {recurring && <p className="text-xs text-text-secondary">Não é possível alterar o tipo de uma recorrência existente.</p>}
      </div>

      <Field label="Descrição" htmlFor="rt-description" error={fieldErrors.description}>
        <Input
          id="rt-description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Ex.: Netflix"
          aria-invalid={!!fieldErrors.description}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor" htmlFor="rt-amount" error={fieldErrors.amount}>
          <Input
            id="rt-amount"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => update('amount', e.target.value)}
            placeholder="0,00"
            aria-invalid={!!fieldErrors.amount}
          />
        </Field>
        <Field label="Frequência" htmlFor="rt-frequency">
          <Select value={form.frequency} onValueChange={(v) => update('frequency', v as RecurrenceFrequency)}>
            <SelectTrigger id="rt-frequency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(frequencyLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoria" htmlFor="rt-category" error={fieldErrors.categoryId}>
          <Select value={form.categoryId} onValueChange={(v) => update('categoryId', v)}>
            <SelectTrigger id="rt-category" className="w-full" aria-invalid={!!fieldErrors.categoryId}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categoriesForType.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Conta" htmlFor="rt-account" error={fieldErrors.accountId}>
          <Select value={form.accountId} onValueChange={(v) => update('accountId', v)}>
            <SelectTrigger id="rt-account" className="w-full" aria-invalid={!!fieldErrors.accountId}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Método de pagamento" htmlFor="rt-payment-method" error={fieldErrors.paymentMethodId}>
        <Select value={form.paymentMethodId} onValueChange={(v) => update('paymentMethodId', v)}>
          <SelectTrigger id="rt-payment-method" className="w-full" aria-invalid={!!fieldErrors.paymentMethodId}>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods?.map((pm) => (
              <SelectItem key={pm.id} value={String(pm.id)}>
                {pm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Primeira execução" htmlFor="rt-start-date" error={fieldErrors.startDate}>
          <Input
            id="rt-start-date"
            type="date"
            value={form.startDate}
            onChange={(e) => update('startDate', e.target.value)}
            disabled={!!recurring?.lastExecutionDate}
            aria-invalid={!!fieldErrors.startDate}
          />
        </Field>
        <Field label="Data final (opcional)" htmlFor="rt-end-date" error={fieldErrors.endDate}>
          <Input
            id="rt-end-date"
            type="date"
            value={form.endDate}
            onChange={(e) => update('endDate', e.target.value)}
            aria-invalid={!!fieldErrors.endDate}
          />
        </Field>
      </div>
      {recurring?.lastExecutionDate && (
        <p className="-mt-3 text-xs text-text-secondary">
          A primeira execução não pode ser alterada porque esta recorrência já gerou transações.
        </p>
      )}

      {recurring && (
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <Label htmlFor="rt-active" className="cursor-pointer">
            Recorrência ativa
          </Label>
          <Switch id="rt-active" checked={form.active} onCheckedChange={(v) => update('active', v)} />
        </div>
      )}

      {formError && <p className="text-xs text-danger">{formError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Salvar recorrência
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
