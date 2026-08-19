import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/common/loading-skeleton'
import { ErrorState } from '@/components/common/error-state'
import { CategoryList } from '@/features/categories/components/category-list'
import { CategoryFormDialog } from '@/features/categories/components/category-form-dialog'
import { useCategoriesQuery, useDeleteCategory } from '@/features/categories/hooks/use-categories'
import { friendlyErrorMessage } from '@/services/api-error'
import type { Category, TransactionType } from '@/types/finance'

export function CategoriesPage() {
  const income = useCategoriesQuery('INCOME')
  const expense = useCategoriesQuery('EXPENSE')
  const deleteCategory = useDeleteCategory()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | undefined>(undefined)
  const [defaultType, setDefaultType] = useState<TransactionType>('EXPENSE')

  function openCreate(type: TransactionType) {
    setEditing(undefined)
    setDefaultType(type)
    setFormOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setFormOpen(true)
  }

  function handleDelete(category: Category) {
    deleteCategory.mutate(category.id, {
      onSuccess: () => toast.success('Categoria excluída.', { description: category.name }),
      onError: (err) => toast.error('Não foi possível excluir a categoria.', { description: friendlyErrorMessage(err) }),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorias"
        description="Organize receitas e despesas para enxergar para onde vai o seu dinheiro."
        actions={
          <Button onClick={() => openCreate('EXPENSE')}>
            <Plus className="size-4" />
            Nova categoria
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Categorias de receita</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => openCreate('INCOME')}>
              <Plus className="size-4" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {income.isPending ? (
              <TableSkeleton rows={3} />
            ) : income.isError ? (
              <ErrorState error={income.error} onRetry={() => income.refetch()} />
            ) : (
              <CategoryList categories={income.data} onEdit={openEdit} onDelete={handleDelete} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Categorias de despesa</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => openCreate('EXPENSE')}>
              <Plus className="size-4" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {expense.isPending ? (
              <TableSkeleton rows={5} />
            ) : expense.isError ? (
              <ErrorState error={expense.error} onRetry={() => expense.refetch()} />
            ) : (
              <CategoryList categories={expense.data} onEdit={openEdit} onDelete={handleDelete} />
            )}
          </CardContent>
        </Card>
      </div>

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} defaultType={defaultType} />
    </div>
  )
}
