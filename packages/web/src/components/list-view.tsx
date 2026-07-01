import type { Page } from '@web-archive/shared/types'
import React, { useContext } from 'react'
import { Globe } from 'lucide-react'
import ScreenshotView from './screenshot-view'
import TagIcon from './tag-icon'
import TagContext from '~/store/tag'

interface ListViewProps {
  pages?: Page[]
  children?: (page: Page) => React.ReactNode
  imgPreview?: boolean
  onItemClick?: (page: Page, event: React.MouseEvent) => void
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return ''
  }
}

// Raindrop-style row: a small thumbnail on the left, then title, description,
// and a meta line of source · date · colour-coded tags.
function ListView({ pages, children, onItemClick }: ListViewProps) {
  const { tagCache } = useContext(TagContext)

  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {pages?.map((page) => {
        const domain = getDomain(page.pageUrl)
        const date = String(page.createdAt).slice(0, 10)
        const tags = tagCache?.filter(tag => tag.pageIds.includes(page.id)) ?? []
        return (
          <div
            key={page.id}
            className="group flex cursor-pointer gap-4 p-3 transition-colors hover:bg-accent"
            onClick={e => onItemClick?.(page, e)}
          >
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
              {page.screenshotId
                ? (
                  <ScreenshotView
                    screenshotId={page.screenshotId}
                    className="h-full w-full object-cover object-top"
                    loadingClassName="h-full w-full"
                  />
                  )
                : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Globe className="h-6 w-6 opacity-40" />
                  </div>
                  )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 font-medium text-foreground">{page.title}</h3>
                {children && (
                  <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                    {children(page)}
                  </div>
                )}
              </div>
              {page.pageDesc && (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{page.pageDesc}</p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-xs text-muted-foreground">
                {domain && <span className="truncate">{domain}</span>}
                {domain && <span className="opacity-40">·</span>}
                <span className="whitespace-nowrap">{date}</span>
                {tags.length > 0 && <span className="opacity-40">·</span>}
                {tags.map(tag => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5"
                  >
                    <TagIcon tag={tag} />
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ListView
