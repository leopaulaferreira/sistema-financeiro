import type { PaymentMethod } from '@/types/finance'

export const mockPaymentMethods: PaymentMethod[] = [
  { id: 'pm-pix', name: 'Pix', type: 'PIX' },
  { id: 'pm-debito', name: 'Cartão de débito', type: 'DEBIT' },
  { id: 'pm-credito', name: 'Cartão de crédito', type: 'CREDIT' },
  { id: 'pm-dinheiro', name: 'Dinheiro', type: 'CASH' },
  { id: 'pm-transferencia', name: 'Transferência', type: 'TRANSFER' },
]
