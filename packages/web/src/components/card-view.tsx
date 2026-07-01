import type { Page } from '@web-archive/shared/types'
import PageCard from './page-card'

// Masonry via CSS columns — cards keep their natural height (cover + text)
// and flow into balanced columns. PageCard uses break-inside-avoid.
function CardView({ pages, onPageDelete }: { pages?: Page[], onPageDelete: (page: Page) => void }) {
  return (
    <div className="gap-4 [column-fill:_balance] columns-1 sm:columns-2 lg:columns-3 2xl:columns-4">
      {pages?.map(page => (
        <div key={page.id} className="mb-4">
          <PageCard page={page} onPageDelete={onPageDelete} />
        </div>
      ))}
    </div>
  )
}

export default CardView
