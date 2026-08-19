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
import { resolveIcon } from '../icon-options'
import type { Category } from '@/types/finance'
import { Tag } from 'lucide-react'

interface CategoryListProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoryList({ categories, onEdit, onDelete }: CategoryListProps) {
  if (categories.length === 0) {
    return <EmptyState icon={Tag} title="Nenhuma categoria neste grupo" description="Crie uma categoria para começar." />
  }

  return (
    <ul className="flex flex-col gap-1">
      {categories.map((category) => {
        const Icon = resolveIcon(category.icon)
        return (
          <li
            key={category.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover"
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in oklch, ${category.color} 16%, transparent)`, color: category.color }}
            >
              <Icon className="size-[18px]" aria-hidden />
            </div>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{category.name}</span>

            <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(category)} aria-label={`Editar ${category.name}`}>
              <Pencil className="size-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-text-secondary hover:text-danger"
                  aria-label={`Excluir ${category.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação removerá "{category.name}" da lista. Transações que já usam essa categoria não serão
                    alteradas nesta fase (dados mockados).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(category)} className="bg-danger text-danger-foreground hover:bg-danger/90">
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
