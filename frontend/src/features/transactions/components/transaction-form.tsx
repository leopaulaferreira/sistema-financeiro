import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { useAccountsQuery } from '@/features/accounts/hooks/use-accounts'
import { usePaymentMethodsQuery } from '@/features/payment-methods/hooks/use-payment-methods'
import { useCreateTransaction, useUpdateTransaction } from '../hooks/use-transactions'
import { ApiClientError, friendlyErrorMessage } from '@/services/api-error'
import { paths } from '@/routes/paths'
import type { Transaction, TransactionType } from '@/types/finance'
import type { TransactionRequest } from '@/types/requests'

interface FormState {
  type: TransactionType
  description: string
  amount: string
  date: string
  categoryId: string
  accountId: string
  paymentMethodId: string
  notes: string
}

function emptyForm(): FormState {
  return {
    type: 'EXPENSE',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    categoryId: '',
    accountId: '',
    paymentMethodId: '',
    notes: '',
  }
}

function formFromTransaction(transaction: Transaction): FormState {
  return {
    type: transaction.type,
    description: transaction.description,
    amount: String(transaction.amount),
    date: transaction.date,
    categoryId: String(transaction.categoryId),
    accountId: String(transaction.accountId),
    paymentMethodId: String(transaction.paymentMethodId),
    notes: transaction.notes ?? '',
  }
}

type FieldErrors = Partial<Record<keyof TransactionRequest, string>>

interface TransactionFormProps {
  transaction?: Transaction
  onSuccess: () => void
  onCancel: () => void
}

export function TransactionForm({ transaction, onSuccess, onCancel }: TransactionFormProps) {
  const [form, setForm] = useState<FormState>(() => (transaction ? formFromTransaction(transaction) : emptyForm()))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')

  const { data: categories, isLoading: loadingCategories } = useCategoriesQuery()
  const { data: accounts, isLoading: loadingAccounts } = useAccountsQuery()
  const { data: paymentMethods, isLoading: loadingPaymentMethods } = usePaymentMethodsQuery()

  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const submitting = createTransaction.isPending || updateTransaction.isPending
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
    if (!form.date) errors.date = 'Informe a data.'
    if (!form.categoryId) errors.categoryId = 'Selecione uma categoria.'
    if (!form.accountId) errors.accountId = 'Selecione uma conta.'
    if (!form.paymentMethodId) errors.paymentMethodId = 'Selecione um método de pagamento.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    const payload: TransactionRequest = {
      description: form.description.trim(),
      amount: amountNumber,
      type: form.type,
      date: form.date,
      categoryId: Number(form.categoryId),
      accountId: Number(form.accountId),
      paymentMethodId: Number(form.paymentMethodId),
      notes: form.notes.trim() || null,
    }

    const mutation = transaction
      ? updateTransaction.mutateAsync({ id: transaction.id, data: payload })
      : createTransaction.mutateAsync(payload)

    mutation
      .then(() => {
        toast.success(transaction ? 'Transação atualizada.' : 'Transação cadastrada.', { description: payload.description })
        onSuccess()
      })
      .catch((error: unknown) => {
        if (error instanceof ApiClientError && error.errors.length > 0) {
          const next: FieldErrors = {}
          for (const fe of error.errors) {
            if (fe.field in payload) next[fe.field as keyof TransactionRequest] = fe.message
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

  const missingResources = [
    { key: 'account', missing: (accounts ?? []).length === 0, message: 'Nenhuma conta cadastrada', cta: 'Criar conta', to: paths.accounts },
    {
      key: 'category',
      missing: (categories ?? []).length === 0,
      message: 'Nenhuma categoria cadastrada',
      cta: 'Criar categoria',
      to: paths.categories,
    },
    {
      key: 'payment-method',
      missing: (paymentMethods ?? []).length === 0,
      message: 'Nenhum método de pagamento cadastrado',
      cta: 'Criar método de pagamento',
      to: paths.paymentMethods,
    },
  ].filter((resource) => resource.missing)

  if (missingResources.length > 0) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border px-4 py-5">
        <p className="text-sm text-text-secondary">
          Para cadastrar uma transação, você precisa ter ao menos uma conta, uma categoria e um método de pagamento.
        </p>
        <ul className="flex flex-col gap-2">
          {missingResources.map((resource) => (
            <li key={resource.key} className="flex items-center justify-between gap-3 rounded-lg bg-surface-hover px-3 py-2">
              <span className="text-sm text-foreground">{resource.message}</span>
              <Button asChild size="sm" variant="secondary">
                <Link to={resource.to}>{resource.cta}</Link>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label>Tipo</Label>
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
      </div>

      <Field label="Descrição" htmlFor="tx-description" error={fieldErrors.description}>
        <Input
          id="tx-description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Ex.: Supermercado"
          aria-invalid={!!fieldErrors.description}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor" htmlFor="tx-amount" error={fieldErrors.amount}>
          <Input
            id="tx-amount"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => update('amount', e.target.value)}
            placeholder="0,00"
            aria-invalid={!!fieldErrors.amount}
          />
        </Field>
        <Field label="Data" htmlFor="tx-date" error={fieldErrors.date}>
          <Input
            id="tx-date"
            type="date"
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
            aria-invalid={!!fieldErrors.date}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoria" htmlFor="tx-category" error={fieldErrors.categoryId}>
          <Select value={form.categoryId} onValueChange={(v) => update('categoryId', v)}>
            <SelectTrigger id="tx-category" className="w-full" aria-invalid={!!fieldErrors.categoryId}>
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
        <Field label="Conta" htmlFor="tx-account" error={fieldErrors.accountId}>
          <Select value={form.accountId} onValueChange={(v) => update('accountId', v)}>
            <SelectTrigger id="tx-account" className="w-full" aria-invalid={!!fieldErrors.accountId}>
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

      <Field label="Método de pagamento" htmlFor="tx-payment-method" error={fieldErrors.paymentMethodId}>
        <Select value={form.paymentMethodId} onValueChange={(v) => update('paymentMethodId', v)}>
          <SelectTrigger id="tx-payment-method" className="w-full" aria-invalid={!!fieldErrors.paymentMethodId}>
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

      <Field label="Observação (opcional)" htmlFor="tx-note">
        <Textarea id="tx-note" value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
      </Field>

      {formError && <p className="text-xs text-danger">{formError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Salvar transação
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
