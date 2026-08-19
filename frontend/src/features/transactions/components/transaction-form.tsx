import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mockCategories } from '@/mocks/categories'
import { mockAccounts } from '@/mocks/accounts'
import { mockPaymentMethods } from '@/mocks/payment-methods'
import type { TransactionType } from '@/types/finance'
import { cn } from '@/lib/utils'

interface FormState {
  type: TransactionType
  description: string
  amount: string
  date: string
  categoryId: string
  accountId: string
  paymentMethodId: string
  note: string
}

const emptyForm: FormState = {
  type: 'EXPENSE',
  description: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  categoryId: '',
  accountId: '',
  paymentMethodId: '',
  note: '',
}

type FormErrors = Partial<Record<keyof FormState, string>>

interface TransactionFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function TransactionForm({ onSuccess, onCancel }: TransactionFormProps) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const categoriesForType = useMemo(() => mockCategories.filter((c) => c.type === form.type), [form.type])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): FormErrors {
    const next: FormErrors = {}
    if (!form.description.trim()) next.description = 'Informe uma descrição.'
    const amountNumber = Number(form.amount.replace(',', '.'))
    if (!form.amount || Number.isNaN(amountNumber) || amountNumber <= 0) next.amount = 'Informe um valor válido maior que zero.'
    if (!form.date) next.date = 'Informe a data.'
    if (!form.categoryId) next.categoryId = 'Selecione uma categoria.'
    if (!form.accountId) next.accountId = 'Selecione uma conta.'
    if (!form.paymentMethodId) next.paymentMethodId = 'Selecione um método de pagamento.'
    return next
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success('Transação cadastrada.', {
        description: `${form.description} · ${form.type === 'INCOME' ? 'Receita' : 'Despesa'} registrada localmente (mock).`,
      })
      setForm(emptyForm)
      onSuccess()
    }, 600)
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

      <Field label="Descrição" htmlFor="tx-description" error={errors.description}>
        <Input
          id="tx-description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Ex.: Supermercado"
          aria-invalid={!!errors.description}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor" htmlFor="tx-amount" error={errors.amount}>
          <Input
            id="tx-amount"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => update('amount', e.target.value)}
            placeholder="0,00"
            aria-invalid={!!errors.amount}
          />
        </Field>
        <Field label="Data" htmlFor="tx-date" error={errors.date}>
          <Input
            id="tx-date"
            type="date"
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
            aria-invalid={!!errors.date}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoria" htmlFor="tx-category" error={errors.categoryId}>
          <Select value={form.categoryId} onValueChange={(v) => update('categoryId', v)}>
            <SelectTrigger id="tx-category" className="w-full" aria-invalid={!!errors.categoryId}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categoriesForType.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Conta" htmlFor="tx-account" error={errors.accountId}>
          <Select value={form.accountId} onValueChange={(v) => update('accountId', v)}>
            <SelectTrigger id="tx-account" className="w-full" aria-invalid={!!errors.accountId}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {mockAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Método de pagamento" htmlFor="tx-payment-method" error={errors.paymentMethodId}>
        <Select value={form.paymentMethodId} onValueChange={(v) => update('paymentMethodId', v)}>
          <SelectTrigger id="tx-payment-method" className="w-full" aria-invalid={!!errors.paymentMethodId}>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {mockPaymentMethods.map((pm) => (
              <SelectItem key={pm.id} value={pm.id}>
                {pm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Observação (opcional)" htmlFor="tx-note">
        <Textarea id="tx-note" value={form.note} onChange={(e) => update('note', e.target.value)} rows={3} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} className={cn(submitting && 'cursor-wait')}>
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
