import type { Page } from '@web-archive/shared/types'
import React, { useContext } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ScreenshotView from './screenshot-view'
import { LinkStatusPill } from './link-status'
import TagContext from '~/store/tag'
import { formatLocalDate } from '~/utils/date'
import { tagLabel } from '~/utils/tag'

// List rows use a tighter 8px/16px stripe period than cards (per the mock).
const LIST_STRIPES = 'repeating-linear-gradient(135deg, var(--surface-2), var(--surface-2) 8px, hsl(var(--background)) 8px, hsl(var(--background)) 16px)'

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return ''
  }
}

interface ListViewProps {
  pages?: Page[]
  onItemClick?: (page: Page, event: React.MouseEvent) => void
  onDelete?: (id: number) => void
}

function ListView({ pages, onItemClick, onDelete }: ListViewProps) {
  const { t } = useTranslation()
  const { tagCache } = useContext(TagContext)

  return (
    <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
      {pages?.map((page) => {
        const domain = getDomain(page.pageUrl)
        const tags = tagCache?.filter(tag => tag.pageIds.includes(page.id)) ?? []
        return (
          <div
            key={page.id}
            className="flex cursor-pointer items-center gap-4 px-[18px] py-3.5 hover:bg-surface-2"
            onClick={e => onItemClick?.(page, e)}
          >
            <div
              className="h-12 w-[76px] shrink-0 overflow-hidden rounded-[9px] border border-border"
              style={{ background: LIST_STRIPES }}
            >
              {page.screenshotId && (
                <ScreenshotView
                  screenshotId={page.screenshotId}
                  className="h-full w-full object-cover object-top"
                  loadingClassName="h-full w-full rounded-none"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="mb-[3px] truncate text-[14.5px] font-bold text-foreground">{page.title}</h4>
              <div className="truncate font-mono text-[11.5px] text-faint">{domain}</div>
            </div>

            {tags.length > 0 && (
              <div className="hidden shrink-0 items-center gap-1.5 desk:flex">
                {tags.map(tag => (
                  <span key={tag.id} className="rounded-full bg-accent-soft px-[9px] py-[2px] font-mono text-[11px] text-primary">
                    {tagLabel(tag)}
                  </span>
                ))}
              </div>
            )}

            <LinkStatusPill status={page.linkStatus} reason={page.linkStatusReason} />

            <span className="w-[92px] shrink-0 text-right font-mono text-[11.5px] text-faint">
              {formatLocalDate(page.createdAt)}
            </span>

            <div className="flex shrink-0 gap-[2px]">
              <button
                type="button"
                aria-label={t('open-original-link')}
                title={t('open-original-link')}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-iconbtn text-faint hover:bg-surface hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(page.pageUrl, '_blank')
                }}
              >
                <ExternalLink size={16} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label={t('delete-page')}
                title={t('delete-page')}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-iconbtn text-faint hover:bg-danger-soft hover:text-danger"
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm(t('delete-this-page-confirm')))
                    onDelete?.(page.id)
                }}
              >
                <Trash2 size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ListView
