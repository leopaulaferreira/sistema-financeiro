import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { useAccountsQuery } from '@/features/accounts/hooks/use-accounts'
import type { TransactionFiltersState } from './transaction-filters.types'
import { ListFilter } from 'lucide-react'

interface TransactionFiltersProps {
  value: TransactionFiltersState
  onChange: (value: TransactionFiltersState) => void
}

export function TransactionFilters({ value, onChange }: TransactionFiltersProps) {
  const { data: categories } = useCategoriesQuery()
  const { data: accounts } = useAccountsQuery()

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-subtle p-3">
      <div className="flex h-10 items-center gap-2 px-1 text-xs font-semibold text-text-secondary">
        <ListFilter className="size-4 text-text-tertiary" aria-hidden />
        <span>Filtros</span>
      </div>
      <Select value={value.period} onValueChange={(period: TransactionFiltersState['period']) => onChange({ ...value, period })}>
        <SelectTrigger className="w-full bg-surface sm:w-40" aria-label="Período">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todo o período</SelectItem>
          <SelectItem value="CURRENT">Este mês</SelectItem>
          <SelectItem value="PREVIOUS">Mês passado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value.type} onValueChange={(type: TransactionFiltersState['type']) => onChange({ ...value, type })}>
        <SelectTrigger className="w-full bg-surface sm:w-40" aria-label="Tipo">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos os tipos</SelectItem>
          <SelectItem value="INCOME">Receita</SelectItem>
          <SelectItem value="EXPENSE">Despesa</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value.categoryId} onValueChange={(categoryId) => onChange({ ...value, categoryId })}>
        <SelectTrigger className="w-full bg-surface sm:w-44" aria-label="Categoria">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas as categorias</SelectItem>
          {categories?.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.accountId} onValueChange={(accountId) => onChange({ ...value, accountId })}>
        <SelectTrigger className="w-full bg-surface sm:w-40" aria-label="Conta">
          <SelectValue placeholder="Conta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas as contas</SelectItem>
          {accounts?.map((a) => (
            <SelectItem key={a.id} value={String(a.id)}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
