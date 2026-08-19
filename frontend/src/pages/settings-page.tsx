import { Settings } from 'lucide-react'
import { PlaceholderPage } from './placeholder-page'

export function SettingsPage() {
  return (
    <PlaceholderPage
      title="Configurações"
      description="Preferências da conta e do aplicativo."
      icon={Settings}
      emptyTitle="Configurações ainda não implementadas"
      emptyDescription="Preferências de conta, notificações e segurança chegam em uma fase futura."
    />
  )
}
