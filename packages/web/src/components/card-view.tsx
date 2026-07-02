import type { Page } from '@web-archive/shared/types'
import PageCard from './page-card'

interface CardViewProps {
  pages?: Page[]
  variant?: 'archive' | 'dashboard'
  onDelete?: (id: number) => void
  onEdited?: (id: number) => void
}

// Uniform card grid from the redesign (replaces the old masonry columns);
// auto-fill keeps it responsive down to a single column on mobile.
function CardView({ pages, variant, onDelete, onEdited }: CardViewProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-4">
      {pages?.map(page => (
        <PageCard key={page.id} page={page} variant={variant} onDelete={onDelete} onEdited={onEdited} />
      ))}
    </div>
  )
}

export default CardView
