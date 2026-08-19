import { PiggyBank } from 'lucide-react'
import { PlaceholderPage } from './placeholder-page'

export function BudgetsPage() {
  return (
    <PlaceholderPage
      title="Orçamentos"
      description="Defina limites de gasto por categoria e acompanhe o quanto já foi consumido."
      icon={PiggyBank}
      emptyTitle="Orçamentos chegam na Fase 7"
      emptyDescription="Esta área está reservada na navegação; a funcionalidade ainda não foi implementada."
    />
  )
}
