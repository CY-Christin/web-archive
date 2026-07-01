import type { Page } from '@web-archive/shared/types'
import { useMemo } from 'react'
import PageCard from './page-card'
import { useMediaQuery } from '~/hooks/useMediaQuery'

function CardView({ pages, onPageDelete }: { pages?: Page[], onPageDelete: (page: Page) => void }) {
  const { '2xl': is2xlScreen, xl: isXlScreen, md: isMdScreen } = useMediaQuery()

  const columnCount = useMemo(() => {
    if (is2xlScreen)
      return 4
    if (isXlScreen)
      return 3
    if (isMdScreen)
      return 2
    return 1
  }, [is2xlScreen, isXlScreen, isMdScreen])

  const reorganizedPages = useMemo(() => {
    const result = Array.from({ length: columnCount }, () => [])
    return result.map((_, idx) =>
      pages
        ?.filter((_, index) => index % columnCount === idx)
        .map(page => (
          <PageCard key={page.id} page={page} onPageDelete={onPageDelete} />
        )),
    )
  }, [pages, columnCount, onPageDelete])

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      {reorganizedPages.map((columnPages, idx) => (
        <div key={idx} className="flex flex-col gap-6">
          {columnPages}
        </div>
      ))}
    </div>
  )
}

export default CardView
