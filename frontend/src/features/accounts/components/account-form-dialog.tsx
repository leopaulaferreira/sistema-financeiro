import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { accountTypeLabels } from '@/mocks/accounts'
import type { Account, AccountType } from '@/types/finance'

const accountColors = [
  'oklch(0.64 0.19 293)',
  'oklch(0.78 0.12 210)',
  'oklch(0.72 0.17 149)',
  'oklch(0.79 0.15 80)',
  'oklch(0.65 0.21 25)',
]

interface AccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account
  onSubmit: (data: Omit<Account, 'id'>) => void
}

export function AccountFormDialog({ open, onOpenChange, account, onSubmit }: AccountFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? 'Editar conta' : 'Nova conta'}</DialogTitle>
          <DialogDescription>Contas ajudam a acompanhar de onde vem e para onde vai o seu dinheiro.</DialogDescription>
        </DialogHeader>
        {open && (
          <AccountForm
            key={account?.id ?? 'new'}
            account={account}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface AccountFormProps {
  account?: Account
  onSubmit: (data: Omit<Account, 'id'>) => void
  onCancel: () => void
  onSuccess: () => void
}

function AccountForm({ account, onSubmit, onCancel, onSuccess }: AccountFormProps) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'CHECKING')
  const [initialBalance, setInitialBalance] = useState(account ? String(account.initialBalance) : '')
  const [active, setActive] = useState(account?.active ?? true)
  const [color, setColor] = useState(account?.color ?? accountColors[0])
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const balanceNumber = Number(initialBalance.replace(',', '.'))
    if (!name.trim()) {
      setError('Informe um nome para a conta.')
      return
    }
    if (initialBalance !== '' && Number.isNaN(balanceNumber)) {
      setError('Saldo inicial inválido.')
      return
    }

    onSubmit({ name: name.trim(), type, initialBalance: balanceNumber || 0, active, color })
    toast.success(account ? 'Conta atualizada.' : 'Conta criada.', { description: name.trim() })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="acc-name">Nome</Label>
        <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank" />
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
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Cor</Label>
        <div className="flex gap-2">
          {accountColors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Selecionar cor ${c}`}
              aria-pressed={color === c}
              className="size-7 rounded-full ring-2 ring-offset-2 ring-offset-surface transition-shadow"
              style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
        <Label htmlFor="acc-active" className="cursor-pointer">
          Conta ativa
        </Label>
        <Switch id="acc-active" checked={active} onCheckedChange={setActive} />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{account ? 'Salvar alterações' : 'Criar conta'}</Button>
      </div>
    </form>
  )
}
