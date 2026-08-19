import type { Transaction } from '@/types/finance'

/**
 * Dados fixos (não aleatórios) para que gráficos, tabelas e paginação
 * fiquem estáveis entre renders enquanto não há integração com a API.
 */
export const mockTransactions: Transaction[] = [
  // Agosto/2026 (mês corrente)
  { id: 't-001', type: 'INCOME', description: 'Salário', amount: 6500, date: '2026-08-05', categoryId: 'cat-salario', accountId: 'acc-nubank', paymentMethodId: 'pm-transferencia' },
  { id: 't-002', type: 'INCOME', description: 'Freelance — projeto site', amount: 1200, date: '2026-08-08', categoryId: 'cat-freelance', accountId: 'acc-itau', paymentMethodId: 'pm-pix' },
  { id: 't-003', type: 'INCOME', description: 'Dividendos', amount: 180, date: '2026-08-15', categoryId: 'cat-investimentos', accountId: 'acc-nubank', paymentMethodId: 'pm-transferencia' },
  { id: 't-004', type: 'EXPENSE', description: 'Aluguel', amount: 1800, date: '2026-08-01', categoryId: 'cat-aluguel', accountId: 'acc-itau', paymentMethodId: 'pm-transferencia' },
  { id: 't-005', type: 'EXPENSE', description: 'Supermercado Extra', amount: 452.3, date: '2026-08-03', categoryId: 'cat-supermercado', accountId: 'acc-nubank', paymentMethodId: 'pm-debito' },
  { id: 't-006', type: 'EXPENSE', description: 'Supermercado Pão de Açúcar', amount: 289.9, date: '2026-08-10', categoryId: 'cat-supermercado', accountId: 'acc-nubank', paymentMethodId: 'pm-credito' },
  { id: 't-007', type: 'EXPENSE', description: 'Supermercado Carrefour', amount: 198.4, date: '2026-08-17', categoryId: 'cat-supermercado', accountId: 'acc-itau', paymentMethodId: 'pm-debito' },
  { id: 't-008', type: 'EXPENSE', description: 'Academia', amount: 129.9, date: '2026-08-05', categoryId: 'cat-academia', accountId: 'acc-nubank', paymentMethodId: 'pm-credito' },
  { id: 't-009', type: 'EXPENSE', description: 'Combustível Shell', amount: 220, date: '2026-08-07', categoryId: 'cat-combustivel', accountId: 'acc-carteira', paymentMethodId: 'pm-dinheiro' },
  { id: 't-010', type: 'EXPENSE', description: 'Combustível Ipiranga', amount: 195.5, date: '2026-08-14', categoryId: 'cat-combustivel', accountId: 'acc-nubank', paymentMethodId: 'pm-debito' },
  { id: 't-011', type: 'EXPENSE', description: 'Netflix', amount: 55.9, date: '2026-08-06', categoryId: 'cat-streaming', accountId: 'acc-nubank', paymentMethodId: 'pm-credito' },
  { id: 't-012', type: 'EXPENSE', description: 'Spotify', amount: 21.9, date: '2026-08-06', categoryId: 'cat-streaming', accountId: 'acc-nubank', paymentMethodId: 'pm-credito' },
  { id: 't-013', type: 'EXPENSE', description: 'Restaurante japonês', amount: 168, date: '2026-08-12', categoryId: 'cat-restaurante', accountId: 'acc-itau', paymentMethodId: 'pm-credito' },
  { id: 't-014', type: 'EXPENSE', description: 'Boteco com amigos', amount: 94.5, date: '2026-08-18', categoryId: 'cat-restaurante', accountId: 'acc-carteira', paymentMethodId: 'pm-dinheiro' },
  { id: 't-015', type: 'EXPENSE', description: 'Farmácia Droga Raia', amount: 76.3, date: '2026-08-09', categoryId: 'cat-farmacia', accountId: 'acc-nubank', paymentMethodId: 'pm-debito' },
  { id: 't-016', type: 'EXPENSE', description: 'Cinema', amount: 68, date: '2026-08-16', categoryId: 'cat-lazer', accountId: 'acc-carteira', paymentMethodId: 'pm-dinheiro' },
  { id: 't-017', type: 'EXPENSE', description: 'Bar com amigos', amount: 112, date: '2026-08-11', categoryId: 'cat-lazer', accountId: 'acc-itau', paymentMethodId: 'pm-credito' },
  { id: 't-018', type: 'EXPENSE', description: 'Padaria', amount: 32.5, date: '2026-08-19', categoryId: 'cat-supermercado', accountId: 'acc-carteira', paymentMethodId: 'pm-dinheiro' },

  // Julho/2026 (mês anterior)
  { id: 't-019', type: 'INCOME', description: 'Salário', amount: 6500, date: '2026-07-05', categoryId: 'cat-salario', accountId: 'acc-nubank', paymentMethodId: 'pm-transferencia' },
  { id: 't-020', type: 'INCOME', description: 'Freelance — landing page', amount: 800, date: '2026-07-08', categoryId: 'cat-freelance', accountId: 'acc-itau', paymentMethodId: 'pm-pix' },
  { id: 't-021', type: 'EXPENSE', description: 'Aluguel', amount: 1800, date: '2026-07-01', categoryId: 'cat-aluguel', accountId: 'acc-itau', paymentMethodId: 'pm-transferencia' },
  { id: 't-022', type: 'EXPENSE', description: 'Supermercado Extra', amount: 410.2, date: '2026-07-04', categoryId: 'cat-supermercado', accountId: 'acc-nubank', paymentMethodId: 'pm-debito' },
  { id: 't-023', type: 'EXPENSE', description: 'Supermercado Carrefour', amount: 265, date: '2026-07-12', categoryId: 'cat-supermercado', accountId: 'acc-itau', paymentMethodId: 'pm-debito' },
  { id: 't-024', type: 'EXPENSE', description: 'Academia', amount: 129.9, date: '2026-07-05', categoryId: 'cat-academia', accountId: 'acc-nubank', paymentMethodId: 'pm-credito' },
  { id: 't-025', type: 'EXPENSE', description: 'Combustível Shell', amount: 210, date: '2026-07-09', categoryId: 'cat-combustivel', accountId: 'acc-carteira', paymentMethodId: 'pm-dinheiro' },
  { id: 't-026', type: 'EXPENSE', description: 'Netflix', amount: 55.9, date: '2026-07-06', categoryId: 'cat-streaming', accountId: 'acc-nubank', paymentMethodId: 'pm-credito' },
  { id: 't-027', type: 'EXPENSE', description: 'Spotify', amount: 21.9, date: '2026-07-06', categoryId: 'cat-streaming', accountId: 'acc-nubank', paymentMethodId: 'pm-credito' },
  { id: 't-028', type: 'EXPENSE', description: 'Restaurante italiano', amount: 145, date: '2026-07-15', categoryId: 'cat-restaurante', accountId: 'acc-itau', paymentMethodId: 'pm-credito' },
  { id: 't-029', type: 'EXPENSE', description: 'Farmácia', amount: 58.9, date: '2026-07-20', categoryId: 'cat-farmacia', accountId: 'acc-nubank', paymentMethodId: 'pm-debito' },
  { id: 't-030', type: 'EXPENSE', description: 'Cinema', amount: 60, date: '2026-07-22', categoryId: 'cat-lazer', accountId: 'acc-carteira', paymentMethodId: 'pm-dinheiro' },
  { id: 't-031', type: 'EXPENSE', description: 'Combustível Ipiranga', amount: 180, date: '2026-07-25', categoryId: 'cat-combustivel', accountId: 'acc-nubank', paymentMethodId: 'pm-debito' },
  { id: 't-032', type: 'EXPENSE', description: 'Restaurante — sushi', amount: 88, date: '2026-07-28', categoryId: 'cat-restaurante', accountId: 'acc-itau', paymentMethodId: 'pm-credito' },
]

export const sortedByDateDesc = (transactions: Transaction[]) =>
  [...transactions].sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)))
