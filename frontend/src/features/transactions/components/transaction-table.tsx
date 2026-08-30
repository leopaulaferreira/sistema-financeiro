import { Pencil, Trash2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Amount } from '@/components/common/amount'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { formatDate } from '@/lib/format'
import type { Transaction } from '@/types/finance'
import { Receipt } from 'lucide-react'

interface TransactionTableProps {
  transactions: Transaction[]
  compact?: boolean
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
}

export function TransactionTable({ transactions, compact = false, onEdit, onDelete }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Nenhuma transação encontrada"
        description="Ajuste os filtros ou cadastre uma nova transação."
      />
    )
  }

  const showActions = !compact && (onEdit || onDelete)

  return (
    <div className="overflow-hidden rounded-xl border border-border-strong">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Descrição</TableHead>
            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
            {!compact && <TableHead className="hidden lg:table-cell">Conta</TableHead>}
            <TableHead className="hidden md:table-cell">Data</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            {showActions && <TableHead className="hidden w-0 sm:table-cell" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id} className="group/transaction">
              <TableCell className="max-w-[240px]">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium text-foreground">{t.description}</span>
                  <span className="text-xs text-text-tertiary md:hidden">{formatDate(t.date)}</span>
                  <Badge variant="outline" className="w-fit border-border font-normal text-text-secondary sm:hidden">
                    {t.categoryName}
                  </Badge>
                  {showActions && (
                    <div className="flex items-center gap-1 pt-1 sm:hidden">
                      <TransactionActions transaction={t} onEdit={onEdit} onDelete={onDelete} />
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline" className="border-border font-normal text-text-secondary">
                  {t.categoryName}
                </Badge>
              </TableCell>
              {!compact && <TableCell className="hidden text-text-secondary lg:table-cell">{t.accountName}</TableCell>}
              <TableCell className="hidden whitespace-nowrap text-text-secondary md:table-cell">{formatDate(t.date)}</TableCell>
              <TableCell className="text-right">
                <Amount value={t.amount} type={t.type} />
              </TableCell>
              {showActions && (
                <TableCell className="hidden text-right sm:table-cell">
                  <div className="opacity-80 transition-opacity duration-150 group-hover/transaction:opacity-100 group-focus-within/transaction:opacity-100">
                    <TransactionActions transaction={t} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TransactionActions({
  transaction,
  onEdit,
  onDelete,
}: Pick<TransactionTableProps, 'onEdit' | 'onDelete'> & { transaction: Transaction }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onEdit(transaction)}
          aria-label={`Editar ${transaction.description}`}
        >
          <Pencil className="size-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-text-secondary hover:text-danger"
          onClick={() => onDelete(transaction)}
          aria-label={`Excluir ${transaction.description}`}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  )
}
