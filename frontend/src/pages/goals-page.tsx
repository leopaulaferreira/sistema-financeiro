import { Target } from 'lucide-react'
import { PlaceholderPage } from './placeholder-page'

export function GoalsPage() {
  return (
    <PlaceholderPage
      title="Metas"
      description="Acompanhe o progresso das suas metas financeiras."
      icon={Target}
      emptyTitle="Metas chegam na Fase 7"
      emptyDescription="Esta área está reservada na navegação; a funcionalidade ainda não foi implementada."
    />
  )
}
