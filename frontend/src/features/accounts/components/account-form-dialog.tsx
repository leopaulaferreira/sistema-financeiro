import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { accountTypeLabels } from '../account-type-style'
import { useCreateAccount, useUpdateAccount } from '../hooks/use-accounts'
import { ApiClientError, friendlyErrorMessage } from '@/services/api-error'
import type { Account, AccountType } from '@/types/finance'

interface AccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account
}

export function AccountFormDialog({ open, onOpenChange, account }: AccountFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? 'Editar conta' : 'Nova conta'}</DialogTitle>
          <DialogDescription>Contas ajudam a acompanhar de onde vem e para onde vai o seu dinheiro.</DialogDescription>
        </DialogHeader>
        {open && (
          <AccountForm key={account?.id ?? 'new'} account={account} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

type FieldErrors = Partial<Record<'name' | 'type' | 'initialBalance', string>>

function AccountForm({ account, onDone }: { account?: Account; onDone: () => void }) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'CHECKING')
  const [initialBalance, setInitialBalance] = useState(account ? String(account.initialBalance) : '')
  const [active, setActive] = useState(account?.active ?? true)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')

  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const submitting = createAccount.isPending || updateAccount.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFieldErrors({})

    const balanceNumber = Number(initialBalance.replace(',', '.'))
    if (!name.trim()) {
      setFieldErrors({ name: 'Informe um nome para a conta.' })
      return
    }
    if (initialBalance === '' || Number.isNaN(balanceNumber)) {
      setFieldErrors({ initialBalance: 'Informe um saldo inicial válido.' })
      return
    }

    const payload = { name: name.trim(), type, initialBalance: balanceNumber }
    const mutation = account
      ? updateAccount.mutateAsync({ id: account.id, data: { ...payload, active } })
      : createAccount.mutateAsync(payload)

    mutation
      .then(() => {
        toast.success(account ? 'Conta atualizada.' : 'Conta criada.', { description: name.trim() })
        onDone()
      })
      .catch((error: unknown) => {
        if (error instanceof ApiClientError && error.errors.length > 0) {
          const next: FieldErrors = {}
          for (const fe of error.errors) {
            if (fe.field === 'name' || fe.field === 'type' || fe.field === 'initialBalance') next[fe.field] = fe.message
          }
          setFieldErrors(next)
        }
        setFormError(friendlyErrorMessage(error))
      })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="acc-name">Nome</Label>
        <Input
          id="acc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Nubank"
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && <p className="text-xs text-danger">{fieldErrors.name}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="acc-type">Tipo</Label>
        <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
          <SelectTrigger id="acc-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(accountTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="acc-balance">Saldo inicial</Label>
        <Input
          id="acc-balance"
          inputMode="decimal"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          placeholder="0,00"
          aria-invalid={!!fieldErrors.initialBalance}
        />
        {fieldErrors.initialBalance && <p className="text-xs text-danger">{fieldErrors.initialBalance}</p>}
      </div>

      {account && (
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <Label htmlFor="acc-active" className="cursor-pointer">
            Conta ativa
          </Label>
          <Switch id="acc-active" checked={active} onCheckedChange={setActive} />
        </div>
      )}

      {formError && <p className="text-xs text-danger">{formError}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {account ? 'Salvar alterações' : 'Criar conta'}
        </Button>
      </div>
    </form>
  )
}
