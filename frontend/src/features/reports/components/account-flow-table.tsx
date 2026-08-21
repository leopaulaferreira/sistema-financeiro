import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/common/empty-state'
import { Amount } from '@/components/common/amount'
import { formatCurrency } from '@/lib/format'
import { Wallet } from 'lucide-react'
import type { AccountFlow } from '@/types/finance'

interface AccountFlowTableProps {
  data: AccountFlow[]
}

/** "Fluxo" (receita - despesa do período) — nunca rotulado como "saldo", que é um conceito diferente (ver ARCHITECTURE.md). */
export function AccountFlowTable({ data }: AccountFlowTableProps) {
  if (data.length === 0) {
    return <EmptyState icon={Wallet} title="Nenhuma conta cadastrada" />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Conta</TableHead>
            <TableHead className="text-right">Receitas</TableHead>
            <TableHead className="text-right">Despesas</TableHead>
            <TableHead className="text-right">Fluxo líquido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.accountId}>
              <TableCell className="font-medium text-foreground">{row.accountName}</TableCell>
              <TableCell className="text-right text-success">{formatCurrency(row.income)}</TableCell>
              <TableCell className="text-right text-danger">{formatCurrency(row.expense)}</TableCell>
              <TableCell className="text-right">
                <Amount value={Math.abs(row.netFlow)} type={row.netFlow >= 0 ? 'INCOME' : 'EXPENSE'} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
