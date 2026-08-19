import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mockCategories } from '@/mocks/categories'
import { mockAccounts } from '@/mocks/accounts'
import type { TransactionFiltersState } from './transaction-filters.types'

interface TransactionFiltersProps {
  value: TransactionFiltersState
  onChange: (value: TransactionFiltersState) => void
}

export function TransactionFilters({ value, onChange }: TransactionFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={value.period} onValueChange={(period: TransactionFiltersState['period']) => onChange({ ...value, period })}>
        <SelectTrigger className="w-full border-border bg-surface sm:w-40" aria-label="Período">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todo o período</SelectItem>
          <SelectItem value="2026-08">Agosto/2026</SelectItem>
          <SelectItem value="2026-07">Julho/2026</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value.type} onValueChange={(type: TransactionFiltersState['type']) => onChange({ ...value, type })}>
        <SelectTrigger className="w-full border-border bg-surface sm:w-40" aria-label="Tipo">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos os tipos</SelectItem>
          <SelectItem value="INCOME">Receita</SelectItem>
          <SelectItem value="EXPENSE">Despesa</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value.categoryId} onValueChange={(categoryId) => onChange({ ...value, categoryId })}>
        <SelectTrigger className="w-full border-border bg-surface sm:w-44" aria-label="Categoria">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas as categorias</SelectItem>
          {mockCategories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.accountId} onValueChange={(accountId) => onChange({ ...value, accountId })}>
        <SelectTrigger className="w-full border-border bg-surface sm:w-40" aria-label="Conta">
          <SelectValue placeholder="Conta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas as contas</SelectItem>
          {mockAccounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
