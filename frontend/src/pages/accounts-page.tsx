import { useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
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
import { AccountCard } from '@/features/accounts/components/account-card'
import { AccountFormDialog } from '@/features/accounts/components/account-form-dialog'
import { useAccountsQuery, useDeleteAccount, useUpdateAccount } from '@/features/accounts/hooks/use-accounts'
import { useAccountsBalance } from '@/features/dashboard/hooks/use-dashboard'
import { friendlyErrorMessage } from '@/services/api-error'
import type { Account } from '@/types/finance'

export function AccountsPage() {
  const { data: accounts, isPending, isError, error, refetch } = useAccountsQuery()
  // accounts-balance exclui contas CREDIT_CARD (ARCHITECTURE.md §8.2) — para
  // essas, não há saldo calculado disponível em nenhum endpoint; mostramos
  // o saldo inicial como aproximação até existir um módulo de cartão.
  const { data: accountsBalance } = useAccountsBalance()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()

  const balanceByAccountId = new Map((accountsBalance ?? []).map((b) => [b.accountId, b.balance]))

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Account | undefined>(undefined)
  const [deleting, setDeleting] = useState<Account | undefined>(undefined)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(account: Account) {
    setEditing(account)
    setFormOpen(true)
  }

  function handleToggleActive(account: Account) {
    updateAccount.mutate(
      { id: account.id, data: { name: account.name, type: account.type, initialBalance: account.initialBalance, active: !account.active } },
      {
        onSuccess: () => toast.success(account.active ? 'Conta desativada.' : 'Conta ativada.', { description: account.name }),
        onError: (err) => toast.error('Não foi possível atualizar a conta.', { description: friendlyErrorMessage(err) }),
      },
    )
  }

  function handleDelete() {
    if (!deleting) return
    deleteAccount.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Conta excluída.', { description: deleting.name })
        setDeleting(undefined)
      },
      onError: (err) => {
        toast.error('Não foi possível excluir a conta.', { description: friendlyErrorMessage(err) })
        setDeleting(undefined)
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contas"
        description="Gerencie as contas usadas para registrar suas transações."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nova conta
          </Button>
        }
      />

      {isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Não foi possível carregar as contas" />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta cadastrada"
          description="Crie sua primeira conta para começar a registrar transações."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nova conta
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              name={account.name}
              type={account.type}
              balance={balanceByAccountId.get(account.id) ?? account.initialBalance}
              active={account.active}
              onEdit={() => openEdit(account)}
              onToggleActive={() => handleToggleActive(account)}
              onDelete={() => setDeleting(account)}
            />
          ))}
        </div>
      )}

      <AccountFormDialog open={formOpen} onOpenChange={setFormOpen} account={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove "{deleting?.name}" permanentemente. Se houver transações vinculadas a ela, a exclusão
              será bloqueada.
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
