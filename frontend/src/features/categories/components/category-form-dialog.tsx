import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { iconOptions } from '../icon-options'
import { useCreateCategory, useUpdateCategory } from '../hooks/use-categories'
import { ApiClientError, friendlyErrorMessage } from '@/services/api-error'
import type { Category, TransactionType } from '@/types/finance'

/** Hex — o backend valida `^#[0-9A-Fa-f]{6}$` (CategoryRequest.color). */
const categoryColors = [
  '#8b5cf6',
  '#22d3ee',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#f97316',
  '#ec4899',
  '#eab308',
  '#14b8a6',
]

const defaultIcon = Object.keys(iconOptions)[0]

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category
  defaultType?: TransactionType
}

export function CategoryFormDialog({ open, onOpenChange, category, defaultType }: CategoryFormDialogProps) {
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
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type FieldErrors = Partial<Record<'name' | 'type' | 'color' | 'icon', string>>

function CategoryForm({
  category,
  defaultType,
  onDone,
}: {
  category?: Category
  defaultType?: TransactionType
  onDone: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState<TransactionType>(category?.type ?? defaultType ?? 'EXPENSE')
  const [color, setColor] = useState(category?.color ?? categoryColors[0])
  const [icon, setIcon] = useState(category?.icon ?? defaultIcon)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')

  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const submitting = createCategory.isPending || updateCategory.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFieldErrors({})

    if (!name.trim()) {
      setFieldErrors({ name: 'Informe um nome para a categoria.' })
      return
    }

    const payload = { name: name.trim(), type, color, icon }
    const mutation = category
      ? updateCategory.mutateAsync({ id: category.id, data: payload })
      : createCategory.mutateAsync(payload)

    mutation
      .then(() => {
        toast.success(category ? 'Categoria atualizada.' : 'Categoria criada.', { description: name.trim() })
        onDone()
      })
      .catch((error: unknown) => {
        if (error instanceof ApiClientError && error.errors.length > 0) {
          const next: FieldErrors = {}
          for (const fe of error.errors) {
            if (fe.field === 'name' || fe.field === 'type' || fe.field === 'color' || fe.field === 'icon') {
              next[fe.field] = fe.message
            }
          }
          setFieldErrors(next)
        }
        setFormError(friendlyErrorMessage(error))
      })
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
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Supermercado"
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && <p className="text-xs text-danger">{fieldErrors.name}</p>}
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
        {fieldErrors.color && <p className="text-xs text-danger">{fieldErrors.color}</p>}
      </div>

      {formError && <p className="text-xs text-danger">{formError}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {category ? 'Salvar alterações' : 'Criar categoria'}
        </Button>
      </div>
    </form>
  )
}
