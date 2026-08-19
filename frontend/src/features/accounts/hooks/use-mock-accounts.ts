import { useState } from 'react'
import { mockAccounts } from '@/mocks/accounts'
import type { Account } from '@/types/finance'

let nextId = 1

export function useMockAccounts() {
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts)

  function createAccount(data: Omit<Account, 'id'>) {
    setAccounts((prev) => [...prev, { ...data, id: `acc-new-${nextId++}` }])
  }

  function updateAccount(id: string, data: Omit<Account, 'id'>) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...data, id } : a)))
  }

  function toggleActive(id: string) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)))
  }

  return { accounts, createAccount, updateAccount, toggleActive }
}
