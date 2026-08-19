import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { iconOptions } from '../icon-options'
import type { Category, TransactionType } from '@/types/finance'

const categoryColors = [
  'oklch(0.64 0.19 293)',
  'oklch(0.78 0.12 210)',
  'oklch(0.72 0.17 149)',
  'oklch(0.79 0.15 80)',
  'oklch(0.65 0.21 25)',
  'oklch(0.62 0.2 300)',
  'oklch(0.7 0.19 45)',
  'oklch(0.66 0.2 340)',
  'oklch(0.72 0.18 60)',
  'oklch(0.75 0.14 190)',
]

const defaultIcon = Object.keys(iconOptions)[0]

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category
  defaultType?: TransactionType
  onSubmit: (data: Omit<Category, 'id'>) => void
}

export function CategoryFormDialog({ open, onOpenChange, category, defaultType, onSubmit }: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          <DialogDescription>Categorias organizam suas transações e alimentam o gráfico de gastos.</DialogDescription>
        </DialogHeader>
        {open && (
          <CategoryForm
            key={category?.id ?? 'new'}
            category={category}
            defaultType={defaultType}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface CategoryFormProps {
  category?: Category
  defaultType?: TransactionType
  onSubmit: (data: Omit<Category, 'id'>) => void
  onCancel: () => void
  onSuccess: () => void
}

function CategoryForm({ category, defaultType, onSubmit, onCancel, onSuccess }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState<TransactionType>(category?.type ?? defaultType ?? 'EXPENSE')
  const [color, setColor] = useState(category?.color ?? categoryColors[0])
  const [icon, setIcon] = useState(category?.icon ?? defaultIcon)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Informe um nome para a categoria.')
      return
    }
    onSubmit({ name: name.trim(), type, color, icon })
    toast.success(category ? 'Categoria atualizada.' : 'Categoria criada.', { description: name.trim() })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label>Tipo</Label>
        <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
          <TabsList className="w-full">
            <TabsTrigger value="EXPENSE" className="data-[state=active]:text-danger">
              Despesa
            </TabsTrigger>
            <TabsTrigger value="INCOME" className="data-[state=active]:text-success">
              Receita
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-name">Nome</Label>
        <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Supermercado" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Ícone</Label>
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(iconOptions).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-label={`Selecionar ícone ${key}`}
              aria-pressed={icon === key}
              className={cn(
                'flex size-9 items-center justify-center rounded-lg border text-text-secondary transition-colors hover:bg-surface-hover',
                icon === key ? 'border-accent-primary bg-accent-primary/12 text-accent-primary' : 'border-border',
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {categoryColors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Selecionar cor ${c}`}
              aria-pressed={color === c}
              className="size-7 rounded-full transition-shadow"
              style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined }}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{category ? 'Salvar alterações' : 'Criar categoria'}</Button>
      </div>
    </form>
  )
}
