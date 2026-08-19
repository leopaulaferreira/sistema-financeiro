import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/common/loading-skeleton'
import { CategoryList } from '@/features/categories/components/category-list'
import { CategoryFormDialog } from '@/features/categories/components/category-form-dialog'
import { useMockCategories } from '@/features/categories/hooks/use-mock-categories'
import { useMockLoading } from '@/hooks/use-mock-loading'
import type { Category, TransactionType } from '@/types/finance'

export function CategoriesPage() {
  const loading = useMockLoading()
  const { categories, createCategory, updateCategory, deleteCategory } = useMockCategories()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | undefined>(undefined)
  const [defaultType, setDefaultType] = useState<TransactionType>('EXPENSE')

  const income = categories.filter((c) => c.type === 'INCOME')
  const expense = categories.filter((c) => c.type === 'EXPENSE')

  function openCreate(type: TransactionType) {
    setEditing(undefined)
    setDefaultType(type)
    setFormOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setFormOpen(true)
  }

  function handleSubmit(data: Omit<Category, 'id'>) {
    if (editing) updateCategory(editing.id, data)
    else createCategory(data)
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
          <CardContent>{loading ? <TableSkeleton rows={3} /> : <CategoryList categories={income} onEdit={openEdit} onDelete={(c) => deleteCategory(c.id)} />}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Categorias de despesa</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => openCreate('EXPENSE')}>
              <Plus className="size-4" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>{loading ? <TableSkeleton rows={5} /> : <CategoryList categories={expense} onEdit={openEdit} onDelete={(c) => deleteCategory(c.id)} />}</CardContent>
        </Card>
      </div>

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} defaultType={defaultType} onSubmit={handleSubmit} />
    </div>
  )
}
