import { Link } from 'react-router-dom'
import { CompassIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { paths } from '@/routes/paths'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-hover text-text-secondary">
        <CompassIcon className="size-6" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-foreground">Página não encontrada</h1>
        <p className="mt-1 text-sm text-text-secondary">O endereço acessado não existe ou foi movido.</p>
      </div>
      <Button asChild>
        <Link to={paths.dashboard}>Voltar ao dashboard</Link>
      </Button>
    </div>
  )
}
