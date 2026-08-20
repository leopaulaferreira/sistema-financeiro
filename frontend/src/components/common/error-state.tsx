import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { friendlyErrorMessage } from '@/services/api-error'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  title?: string
}

export function ErrorState({ error, onRetry, title = 'Não foi possível carregar os dados' }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-danger/30 bg-danger/5 px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-danger/12 text-danger">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-text-secondary">{friendlyErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-border">
          <RotateCw className="size-4" />
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
