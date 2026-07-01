import type { Page } from '@web-archive/shared/types'
import React, { memo, useContext, useState } from 'react'
import { useRequest } from 'ahooks'
import { Button } from '@web-archive/shared/components/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@web-archive/shared/components/tooltip'
import { ExternalLink, Eye, EyeOff, Globe, SquarePen, Trash } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { TooltipPortal } from '@radix-ui/react-tooltip'
import { useTranslation } from 'react-i18next'
import ScreenshotView from './screenshot-view'
import TagIcon from './tag-icon'
import { updatePageShowcase } from '~/data/page'
import CardEditDialog from '~/components/card-edit-dialog'
import TagContext from '~/store/tag'
import { Link } from '~/router'

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return ''
  }
}

function Comp({ page, onPageDelete }: { page: Page, onPageDelete?: (page: Page) => void }) {
  const { t } = useTranslation()
  const { tagCache, refreshTagCache } = useContext(TagContext)
  const bindTags = tagCache?.filter(tag => tag.pageIds.includes(page.id)) ?? []

  const location = useLocation()
  const isShowcased = location.pathname.startsWith('/showcase')
  const redirectTo = isShowcased ? `/showcase/page/:slug` : `/page/:slug`
  const domain = getDomain(page.pageUrl)
  const date = String(page.createdAt).slice(0, 10)

  const handleClickPageUrl = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(page.pageUrl, '_blank')
  }

  const handleDeletePage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm(t('delete-this-page-confirm')))
      onPageDelete?.(page)
  }

  const [showcaseState, setShowcaseState] = useState(page.isShowcased)
  const { run: updateShowcase } = useRequest(
    updatePageShowcase,
    {
      manual: true,
      onSuccess() {
        toast.success(t('success'))
        setShowcaseState(showcaseState === 1 ? 0 : 1)
      },
    },
  )

  const [openCardEditDialog, setOpenCardEditDialog] = useState(false)
  const handleEditPage = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await refreshTagCache()
    setOpenCardEditDialog(true)
  }

  const actionBtn = 'h-8 w-8 bg-card/90 backdrop-blur-sm shadow-card hover:bg-card'

  return (
    <>
      {!isShowcased && (
        <CardEditDialog open={openCardEditDialog} onOpenChange={setOpenCardEditDialog} pageId={page.id} />
      )}

      <Link
        to={redirectTo}
        params={{ slug: page.id.toString() }}
        className="group relative flex break-inside-avoid flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
      >
        {/* Cover */}
        <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
          {page.screenshotId
            ? (
              <ScreenshotView
                screenshotId={page.screenshotId}
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                loadingClassName="h-full w-full"
              />
              )
            : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Globe className="h-8 w-8 opacity-30" />
              </div>
              )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-2 font-display text-[15px] font-medium leading-snug text-foreground">{page.title}</h3>
          {page.pageDesc && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{page.pageDesc}</p>
          )}
          <div className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            {domain && <span className="truncate">{domain}</span>}
            {domain && <span className="opacity-40">·</span>}
            <span className="whitespace-nowrap">{date}</span>
          </div>
          {bindTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {bindTags.map(tag => (
                <span key={tag.id} className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                  <TagIcon tag={tag} />
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hover actions */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <TooltipProvider delayDuration={200}>
            {!isShowcased && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className={actionBtn} onClick={handleEditPage}>
                    <SquarePen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('edit-page')}</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className={actionBtn} onClick={handleClickPageUrl}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>{t('open-original-link')}</TooltipContent>
              </TooltipPortal>
            </Tooltip>
            {!isShowcased && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={actionBtn} onClick={handleDeletePage}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('delete-page')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={actionBtn}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        updateShowcase({ id: page.id, isShowcased: showcaseState === 1 ? 0 : 1 })
                      }}
                    >
                      {showcaseState === 1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent>
                      {showcaseState === 1 ? t('remove-from-showcase') : t('add-to-showcase')}
                    </TooltipContent>
                  </TooltipPortal>
                </Tooltip>
              </>
            )}
          </TooltipProvider>
        </div>
      </Link>
    </>
  )
}

const PageCard = memo(Comp)

export default PageCard
