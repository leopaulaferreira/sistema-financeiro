import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { paymentMethodTypeLabels } from '../payment-method-type-style'
import { useCreatePaymentMethod, useUpdatePaymentMethod } from '../hooks/use-payment-methods'
import { ApiClientError, friendlyErrorMessage } from '@/services/api-error'
import type { PaymentMethod, PaymentMethodType } from '@/types/finance'

interface PaymentMethodFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentMethod?: PaymentMethod
}

export function PaymentMethodFormDialog({ open, onOpenChange, paymentMethod }: PaymentMethodFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{paymentMethod ? 'Editar método de pagamento' : 'Novo método de pagamento'}</DialogTitle>
          <DialogDescription>Métodos de pagamento identificam como cada transação foi paga.</DialogDescription>
        </DialogHeader>
        {open && (
          <PaymentMethodForm
            key={paymentMethod?.id ?? 'new'}
            paymentMethod={paymentMethod}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type FieldErrors = Partial<Record<'name' | 'type', string>>

function PaymentMethodForm({ paymentMethod, onDone }: { paymentMethod?: PaymentMethod; onDone: () => void }) {
  const [name, setName] = useState(paymentMethod?.name ?? '')
  const [type, setType] = useState<PaymentMethodType>(paymentMethod?.type ?? 'CREDIT_CARD')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')

  const createPaymentMethod = useCreatePaymentMethod()
  const updatePaymentMethod = useUpdatePaymentMethod()
  const submitting = createPaymentMethod.isPending || updatePaymentMethod.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFieldErrors({})

    if (!name.trim()) {
      setFieldErrors({ name: 'Informe um nome para o método de pagamento.' })
      return
    }

    const payload = { name: name.trim(), type }
    const mutation = paymentMethod
      ? updatePaymentMethod.mutateAsync({ id: paymentMethod.id, data: payload })
      : createPaymentMethod.mutateAsync(payload)

    mutation
      .then(() => {
        toast.success(paymentMethod ? 'Método de pagamento atualizado.' : 'Método de pagamento criado.', {
          description: name.trim(),
        })
        onDone()
      })
      .catch((error: unknown) => {
        if (error instanceof ApiClientError && error.errors.length > 0) {
          const next: FieldErrors = {}
          for (const fe of error.errors) {
            if (fe.field === 'name' || fe.field === 'type') next[fe.field] = fe.message
          }
          setFieldErrors(next)
        }
        setFormError(friendlyErrorMessage(error))
      })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="pm-name">Nome</Label>
        <Input
          id="pm-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Cartão Nubank"
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && <p className="text-xs text-danger">{fieldErrors.name}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pm-type">Tipo</Label>
        <Select value={type} onValueChange={(v) => setType(v as PaymentMethodType)}>
          <SelectTrigger id="pm-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(paymentMethodTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.type && <p className="text-xs text-danger">{fieldErrors.type}</p>}
      </div>

      {formError && <p className="text-xs text-danger">{formError}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {paymentMethod ? 'Salvar alterações' : 'Criar método'}
        </Button>
      </div>
    </form>
  )
}
