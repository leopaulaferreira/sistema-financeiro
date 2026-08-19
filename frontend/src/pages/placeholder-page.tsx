import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'

interface PlaceholderPageProps {
  title: string
  description: string
  icon: LucideIcon
  emptyTitle: string
  emptyDescription: string
}

export function PlaceholderPage({ title, description, icon, emptyTitle, emptyDescription }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
    </div>
  )
}
