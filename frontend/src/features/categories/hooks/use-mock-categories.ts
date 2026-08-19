import { useState } from 'react'
import { mockCategories } from '@/mocks/categories'
import type { Category } from '@/types/finance'

let nextId = 1

export function useMockCategories() {
  const [categories, setCategories] = useState<Category[]>(mockCategories)

  function createCategory(data: Omit<Category, 'id'>) {
    setCategories((prev) => [...prev, { ...data, id: `cat-new-${nextId++}` }])
  }

  function updateCategory(id: string, data: Omit<Category, 'id'>) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...data, id } : c)))
  }

  function deleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  return { categories, createCategory, updateCategory, deleteCategory }
}
