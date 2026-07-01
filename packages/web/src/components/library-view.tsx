import { useInfiniteScroll, useRequest } from 'ahooks'
import type { Ref } from '@web-archive/shared/components/scroll-area'
import { ScrollArea } from '@web-archive/shared/components/scroll-area'
import { Button } from '@web-archive/shared/components/button'
import { Input } from '@web-archive/shared/components/input'
import { Grid2X2, List, Search, Trash, X } from 'lucide-react'
import type { Page } from '@web-archive/shared/types'
import React, { useContext, useEffect, useMemo, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CardView from './card-view'
import ListView from './list-view'
import TagIcon from './tag-icon'
import LoadingWrapper from './loading-wrapper'
import LoadingMore from './loading-more'
import EmptyWrapper from './empty-wrapper'
import { deletePage, queryPage } from '~/data/page'
import { getAllFolder } from '~/data/folder'
import AppContext from '~/store/app'
import TagContext from '~/store/tag'
import { useNavigate } from '~/router'

interface LibraryOutletContext {
  keyword: string
  searchTrigger: boolean
  selectedTag: number | null
  setKeyword: (keyword: string) => void
  handleSearch: () => void
  setSelectedTag: (tag: number | null) => void
}

const PAGE_SIZE = 24

// The single browsing surface: search + filters over one grid/list of pages.
// Used by the home route (all pages) and folder routes (scoped by folderId).
function LibraryView({ folderId }: { folderId?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scrollRef = useRef<Ref>(null)
  const { keyword, searchTrigger, selectedTag, setKeyword, handleSearch, setSelectedTag } = useOutletContext<LibraryOutletContext>()
  const { view, setView } = useContext(AppContext)
  const { tagCache } = useContext(TagContext)

  const { data: folders } = useRequest(getAllFolder)
  const folderName = useMemo(
    () => folders?.find(f => String(f.id) === String(folderId))?.name,
    [folders, folderId],
  )
  const selectedTagObj = useMemo(
    () => tagCache?.find(tag => tag.id === selectedTag),
    [tagCache, selectedTag],
  )

  const { data: pagesData, loading: pagesLoading, mutate: setPageData, loadingMore, reload } = useInfiniteScroll(
    async (d) => {
      const pageNumber = d?.pageNumber ?? 1
      const res = await queryPage({
        folderId,
        pageNumber,
        pageSize: PAGE_SIZE,
        keyword,
        tagId: selectedTag,
      })
      return {
        list: res.list ?? [],
        pageNumber: pageNumber + 1,
        total: res.total,
      }
    },
    {
      target: scrollRef.current?.viewport,
      isNoMore: (d) => {
        if (!d)
          return false
        return d.list.length >= d.total || d.pageNumber > Math.ceil(d.total / PAGE_SIZE)
      },
    },
  )

  useEffect(() => {
    reload()
  }, [searchTrigger, folderId, selectedTag])

  const { run: handleDeletePage } = useRequest(deletePage, {
    manual: true,
    onSuccess: (data) => {
      setPageData({
        list: pagesData?.list.filter(page => page.id !== data?.id) ?? [],
        pageNumber: pagesData?.pageNumber ?? 2,
        total: Math.max(0, (pagesData?.total ?? 1) - 1),
      })
    },
  })

  const handleItemClick = (page: Page, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey)
      window.open(`/#/page/${page.id}`, '_blank')
    else
      navigate('/page/:slug', { params: { slug: String(page.id) } })
  }

  const title = folderName ?? t('all-archives')
  const total = pagesData?.total

  return (
    <div className="flex h-screen flex-1 flex-col">
      {/* Command bar: title + search + view toggle */}
      <div className="flex flex-col gap-3 border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-semibold text-foreground">{title}</h1>
            {total !== undefined && (
              <p className="text-xs text-muted-foreground">{t('n-items', { count: total })}</p>
            )}
          </div>

          <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-input bg-card px-3 transition-colors focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              className="border-none bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={t('search-placeholder')}
              value={keyword}
              showRing={false}
              onChange={e => setKeyword(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === 'Enter')
                  handleSearch()
              }}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted p-1">
            <Button variant="ghost" size="icon" className={segmentClass(view === 'card')} onClick={() => setView('card')}>
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className={segmentClass(view === 'list')} onClick={() => setView('list')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active filter chip */}
        {selectedTagObj && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent"
              onClick={() => setSelectedTag(null)}
            >
              <TagIcon tag={selectedTagObj} />
              {selectedTagObj.name}
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 overflow-auto">
        <div className="p-6">
          <LoadingWrapper loading={pagesLoading || (!pagesData)}>
            <EmptyWrapper empty={pagesData?.list.length === 0}>
              {view === 'card'
                ? (
                  <CardView pages={pagesData?.list} onPageDelete={handleDeletePage} />
                  )
                : (
                  <ListView pages={pagesData?.list} onItemClick={handleItemClick} imgPreview>
                    {page => (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(t('delete-this-page-confirm')))
                            handleDeletePage(page)
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </ListView>
                  )}
            </EmptyWrapper>
            {loadingMore && <LoadingMore />}
          </LoadingWrapper>
        </div>
      </ScrollArea>
    </div>
  )
}

function segmentClass(active: boolean) {
  return `h-8 w-8 rounded-md transition-colors ${
    active
      ? 'bg-card text-foreground shadow-card hover:bg-card'
      : 'bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground'
  }`
}

export default LibraryView
