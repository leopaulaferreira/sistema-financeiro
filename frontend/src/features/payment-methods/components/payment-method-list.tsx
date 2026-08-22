import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { paymentMethodTypeLabels, paymentMethodTypeStyle } from '../payment-method-type-style'
import type { PaymentMethod } from '@/types/finance'
import { CreditCard } from 'lucide-react'

interface PaymentMethodListProps {
  paymentMethods: PaymentMethod[]
  onEdit: (paymentMethod: PaymentMethod) => void
  onDelete: (paymentMethod: PaymentMethod) => void
}

export function PaymentMethodList({ paymentMethods, onEdit, onDelete }: PaymentMethodListProps) {
  if (paymentMethods.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Nenhum método de pagamento cadastrado"
        description="Crie um método de pagamento para começar a registrar transações."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-1">
      {paymentMethods.map((paymentMethod) => {
        const { icon: Icon, colorVar } = paymentMethodTypeStyle[paymentMethod.type]
        return (
          <li
            key={paymentMethod.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover"
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in oklch, ${colorVar} 16%, transparent)`, color: colorVar }}
            >
              <Icon className="size-[18px]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{paymentMethod.name}</p>
              <p className="truncate text-xs text-text-secondary">{paymentMethodTypeLabels[paymentMethod.type]}</p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onEdit(paymentMethod)}
              aria-label={`Editar ${paymentMethod.name}`}
            >
              <Pencil className="size-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-text-secondary hover:text-danger"
                  aria-label={`Excluir ${paymentMethod.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir método de pagamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação remove "{paymentMethod.name}" permanentemente. Se houver transações vinculadas a ele, a
                    exclusão será bloqueada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(paymentMethod)}
                    className="bg-danger text-danger-foreground hover:bg-danger/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        )
      })}
    </ul>
  )
}
