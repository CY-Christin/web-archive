import type { Page } from '@web-archive/shared/types'
import React, { memo, useContext, useState } from 'react'
import { useRequest } from 'ahooks'
import { ExternalLink, Pencil, Star, Trash2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { cn } from '@web-archive/shared/utils'
import ScreenshotView from './screenshot-view'
import { LINK_STATUS_META, LinkStatusDot } from './link-status'
import CardEditDialog from '~/components/card-edit-dialog'
import { updatePageShowcase } from '~/data/page'
import TagContext from '~/store/tag'
import { Link } from '~/router'
import { formatLocalDate } from '~/utils/date'

// Diagonal-stripe thumbnail placeholder from the design mock (11px/22px period).
// --background is an HSL triplet token, hence the hsl() wrapper.
const CARD_STRIPES = 'repeating-linear-gradient(135deg, var(--surface-2), var(--surface-2) 11px, hsl(var(--background)) 11px, hsl(var(--background)) 22px)'

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return ''
  }
}

interface PageCardProps {
  page: Page
  variant?: 'archive' | 'dashboard'
  onDelete?: (id: number) => void
  /** Fires when the edit dialog closes, so the list owner can re-sync the row. */
  onEdited?: (id: number) => void
}

function Comp({ page, variant = 'archive', onDelete, onEdited }: PageCardProps) {
  const { t } = useTranslation()
  const { tagCache, refreshTagCache } = useContext(TagContext)
  const bindTags = tagCache?.filter(tag => tag.pageIds.includes(page.id)) ?? []

  const location = useLocation()
  const isShowcaseContext = location.pathname.startsWith('/showcase')
  const redirectTo = isShowcaseContext ? '/showcase/page/:slug' : '/page/:slug'
  const domain = getDomain(page.pageUrl)
  const statusMeta = page.linkStatus ? LINK_STATUS_META[page.linkStatus] : null

  const handleOpenOriginal = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(page.pageUrl, '_blank')
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm(t('delete-this-page-confirm')))
      onDelete?.(page.id)
  }

  const [showcaseState, setShowcaseState] = useState(page.isShowcased)
  const { run: updateShowcase } = useRequest(updatePageShowcase, {
    manual: true,
    onSuccess() {
      toast.success(t('success'))
      setShowcaseState(prev => (prev === 1 ? 0 : 1))
    },
  })
  const handleToggleShowcase = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    updateShowcase({ id: page.id, isShowcased: showcaseState === 1 ? 0 : 1 })
  }

  const [editOpen, setEditOpen] = useState(false)
  const handleEditOpenChange = (open: boolean) => {
    setEditOpen(open)
    if (!open)
      onEdited?.(page.id)
  }
  const handleEdit = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await refreshTagCache()
    setEditOpen(true)
  }

  const showEditAndDelete = variant === 'archive' && !isShowcaseContext
  const showStar = !isShowcaseContext
  const actionBtn = 'flex h-7 w-7 items-center justify-center rounded-iconbtn text-faint'

  return (
    <>
      {showEditAndDelete && (
        <CardEditDialog open={editOpen} onOpenChange={handleEditOpenChange} pageId={page.id} />
      )}

      <Link
        to={redirectTo}
        params={{ slug: page.id.toString() }}
        className="group flex flex-col overflow-hidden rounded-card border border-border bg-surface transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-[3px] hover:border-border-strong hover:shadow-lift"
      >
        {/* 16:10 thumbnail (real screenshot or striped placeholder) + fake browser bar */}
        <div className="relative aspect-[16/10] w-full border-b border-border" style={{ background: CARD_STRIPES }}>
          {page.screenshotId && (
            <ScreenshotView
              screenshotId={page.screenshotId}
              className="absolute inset-0 h-full w-full object-cover object-top"
              loadingClassName="absolute inset-0 h-full w-full rounded-none"
            />
          )}
          <div className="absolute inset-x-0 top-0 flex h-[26px] items-center gap-[5px] border-b border-border bg-surface px-2.5">
            <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-border-strong" />
            <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-border-strong" />
            <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-border-strong" />
            <span className="ml-2 min-w-0 truncate font-mono text-[10px] text-faint">{domain}</span>
            {statusMeta && (
              <span className="ml-auto flex shrink-0 items-center gap-1">
                <LinkStatusDot status={page.linkStatus} size={6} />
                <span className="font-mono text-[9.5px] text-faint">{t(statusMeta.labelKey)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Text block */}
        <div className="flex flex-1 flex-col gap-[9px] px-4 pb-[15px] pt-3.5">
          <h4 className="line-clamp-2 text-[14.5px] font-bold leading-[1.35] text-foreground">{page.title}</h4>
          {variant === 'archive' && page.pageDesc && (
            <p className="line-clamp-2 text-[12.5px] leading-normal text-muted-foreground">{page.pageDesc}</p>
          )}
          {bindTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {bindTags.map(tag => (
                <span key={tag.id} className="rounded-full bg-accent-soft px-2 py-[2px] font-mono text-[11px] text-primary">
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Footer: mono date + actions */}
          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="font-mono text-[11px] text-faint">{formatLocalDate(page.createdAt)}</span>
            <div className="flex gap-1">
              {showEditAndDelete && (
                <button
                  type="button"
                  aria-label={t('edit-page')}
                  title={t('edit-page')}
                  className={cn(actionBtn, 'hover:bg-surface-2 hover:text-primary')}
                  onClick={handleEdit}
                >
                  <Pencil size={15} strokeWidth={1.75} />
                </button>
              )}
              <button
                type="button"
                aria-label={t('open-original-link')}
                title={t('open-original-link')}
                className={cn(actionBtn, 'hover:bg-surface-2 hover:text-primary')}
                onClick={handleOpenOriginal}
              >
                <ExternalLink size={15} strokeWidth={1.75} />
              </button>
              {showStar && (
                <button
                  type="button"
                  aria-label={showcaseState === 1 ? t('remove-from-showcase') : t('add-to-showcase')}
                  title={showcaseState === 1 ? t('remove-from-showcase') : t('add-to-showcase')}
                  className={cn(actionBtn, 'hover:bg-surface-2 hover:text-foreground', showcaseState === 1 && 'text-primary')}
                  onClick={handleToggleShowcase}
                >
                  <Star size={15} strokeWidth={1.75} fill={showcaseState === 1 ? 'currentColor' : 'none'} />
                </button>
              )}
              {showEditAndDelete && (
                <button
                  type="button"
                  aria-label={t('delete-page')}
                  title={t('delete-page')}
                  className={cn(actionBtn, 'hover:bg-danger-soft hover:text-danger')}
                  onClick={handleDelete}
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        </div>
      </Link>
    </>
  )
}

const PageCard = memo(Comp)

export default PageCard
