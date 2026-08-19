import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoriesService } from '@/services/categories-service'
import { queryKeys } from '@/lib/query-keys'
import type { TransactionType } from '@/types/finance'
import type { CategoryRequest } from '@/types/requests'

export function useCategoriesQuery(type?: TransactionType) {
  return useQuery({
    queryKey: queryKeys.categories(type),
    queryFn: () => categoriesService.list(type),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CategoryRequest) => categoriesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryRequest }) => categoriesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => categoriesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}
