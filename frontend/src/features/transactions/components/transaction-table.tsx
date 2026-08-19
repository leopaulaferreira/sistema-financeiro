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
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            {!compact && <TableHead>Conta</TableHead>}
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            {showActions && <TableHead className="w-0" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="max-w-[220px] truncate font-medium text-foreground">{t.description}</TableCell>
              <TableCell>
                <Badge variant="outline" className="border-border font-normal text-text-secondary">
                  {t.categoryName}
                </Badge>
              </TableCell>
              {!compact && <TableCell className="text-text-secondary">{t.accountName}</TableCell>}
              <TableCell className="whitespace-nowrap text-text-secondary">{formatDate(t.date)}</TableCell>
              <TableCell className="text-right">
                <Amount value={t.amount} type={t.type} />
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onEdit(t)}
                        aria-label={`Editar ${t.description}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-text-secondary hover:text-danger"
                        onClick={() => onDelete(t)}
                        aria-label={`Excluir ${t.description}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
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
