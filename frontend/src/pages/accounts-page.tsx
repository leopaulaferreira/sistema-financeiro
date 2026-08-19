import { useMemo, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { StatCardSkeleton } from '@/components/common/loading-skeleton'
import { AccountCard } from '@/features/accounts/components/account-card'
import { AccountFormDialog } from '@/features/accounts/components/account-form-dialog'
import { useMockAccounts } from '@/features/accounts/hooks/use-mock-accounts'
import { mockTransactions } from '@/mocks'
import { computeAccountBalance } from '@/lib/dashboard-calculations'
import { useMockLoading } from '@/hooks/use-mock-loading'
import type { Account } from '@/types/finance'

export function AccountsPage() {
  const loading = useMockLoading()
  const { accounts, createAccount, updateAccount, toggleActive } = useMockAccounts()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Account | undefined>(undefined)

  const balances = useMemo(() => {
    const map = new Map<string, number>()
    for (const account of accounts) map.set(account.id, computeAccountBalance(account, mockTransactions))
    return map
  }, [accounts])

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(account: Account) {
    setEditing(account)
    setFormOpen(true)
  }

  function handleSubmit(data: Omit<Account, 'id'>) {
    if (editing) updateAccount(editing.id, data)
    else createAccount(data)
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

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
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
              account={account}
              balance={balances.get(account.id) ?? 0}
              onEdit={() => openEdit(account)}
              onToggleActive={() => toggleActive(account.id)}
            />
          ))}
        </div>
      )}

      <AccountFormDialog open={formOpen} onOpenChange={setFormOpen} account={editing} onSubmit={handleSubmit} />
    </div>
  )
}
