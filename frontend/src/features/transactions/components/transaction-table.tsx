import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Amount } from '@/components/common/amount'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { formatDate } from '@/lib/format'
import { categoryById } from '@/mocks/categories'
import { mockAccounts } from '@/mocks/accounts'
import type { Transaction } from '@/types/finance'
import { Receipt } from 'lucide-react'

interface TransactionTableProps {
  transactions: Transaction[]
  compact?: boolean
}

export function TransactionTable({ transactions, compact = false }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Nenhuma transação encontrada"
        description="Ajuste os filtros ou cadastre uma nova transação."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            {!compact && <TableHead>Conta</TableHead>}
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => {
            const category = categoryById(t.categoryId)
            const account = mockAccounts.find((a) => a.id === t.accountId)
            return (
              <TableRow key={t.id}>
                <TableCell className="max-w-[220px] truncate font-medium text-foreground">{t.description}</TableCell>
                <TableCell>
                  {category && (
                    <Badge
                      variant="outline"
                      className="border-transparent font-normal"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${category.color} 16%, transparent)`,
                        color: category.color,
                      }}
                    >
                      {category.name}
                    </Badge>
                  )}
                </TableCell>
                {!compact && <TableCell className="text-text-secondary">{account?.name}</TableCell>}
                <TableCell className="whitespace-nowrap text-text-secondary">{formatDate(t.date)}</TableCell>
                <TableCell className="text-right">
                  <Amount value={t.amount} type={t.type} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
