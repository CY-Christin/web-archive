import { useInfiniteScroll, useRequest, useWhyDidYouUpdate } from 'ahooks'
import type { Ref } from '@web-archive/shared/components/scroll-area'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Page } from '@web-archive/shared/types'
import { ScrollArea } from '@web-archive/shared/components/scroll-area'
import { Badge } from '@web-archive/shared/components/badge'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isNil, isNotNil } from '@web-archive/shared/utils'
import { deletePage, getRecentSavePage, queryPage } from '~/data/page'
import PageCard from '~/components/page-card'
import Header from '~/components/header'
import LoadingWrapper from '~/components/loading-wrapper'
import CardView from '~/components/card-view'
import LoadingMore from '~/components/loading-more'
import { useShouldShowRecent } from '~/hooks/useShouldShowRecent'
import TagContext from '~/store/tag'

interface HomeOutletContext {
  keyword: string
  searchTrigger: boolean
  selectedTag: number | null
  setKeyword: (keyword: string) => void
  handleSearch: () => void
  setSelectedTag: (tag: number | null) => void
}

// A calm "library" landing view: a tag cloud to jump into a filtered search,
// plus recent additions grouped into a simple timeline by save date.
function LibraryHome() {
  const { t } = useTranslation()
  const { setSelectedTag } = useOutletContext<HomeOutletContext>()
  const { tagCache } = useContext(TagContext)
  const { shouldShowRecent } = useShouldShowRecent()
  const [pages, setPages] = useState<Page[]>([])
  useRequest(getRecentSavePage, {
    onSuccess: (data) => {
      setPages(data ?? [])
    },
    ready: shouldShowRecent,
  })

  const { run: handleDeletePage } = useRequest(deletePage, {
    manual: true,
    onSuccess: (data) => {
      setPages(pages.filter(page => page.id !== data?.id))
    },
  })

  // Scale each tag's size by how many pages carry it (four buckets).
  const maxTagCount = useMemo(
    () => tagCache.reduce((max, tag) => Math.max(max, tag.pageIds.length), 0),
    [tagCache],
  )
  const tagSizeClass = (count: number) => {
    if (maxTagCount === 0)
      return 'text-sm'
    const ratio = count / maxTagCount
    if (ratio > 0.75)
      return 'text-lg'
    if (ratio > 0.5)
      return 'text-base'
    if (ratio > 0.25)
      return 'text-sm'
    return 'text-xs'
  }

  // Group recent pages into date buckets, preserving the newest-first order.
  const timeline = useMemo(() => {
    const groups: { date: string, pages: Page[] }[] = []
    for (const page of pages) {
      const date = String(page.createdAt).slice(0, 10)
      const last = groups[groups.length - 1]
      if (last && last.date === date)
        last.pages.push(page)
      else
        groups.push({ date, pages: [page] })
    }
    return groups
  }, [pages])

  return (
    <ScrollArea className="p-6 overflow-auto h-[calc(100vh-58px)]">
      <div className="mx-auto max-w-6xl space-y-8">
        {tagCache.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{t('tags')}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {tagCache.map(tag => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className={`cursor-pointer select-none transition-colors hover:bg-accent ${tagSizeClass(tag.pageIds.length)}`}
                  onClick={() => setSelectedTag(tag.id)}
                >
                  {tag.name}
                  <span className="ml-1 text-muted-foreground">{tag.pageIds.length}</span>
                </Badge>
              ))}
            </div>
          </section>
        )}

        {shouldShowRecent && (
          <section className="space-y-6">
            <h2 className="text-sm font-semibold text-muted-foreground">{t('recent-added')}</h2>
            {timeline.length === 0
              ? <div className="text-sm text-muted-foreground">{t('no-pages-yet')}</div>
              : timeline.map(group => (
                <div key={group.date} className="space-y-3">
                  <h3 className="text-xs font-medium text-muted-foreground">{group.date}</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {group.pages.map(page => (
                      <PageCard key={page.id} page={page} onPageDelete={handleDeletePage} />
                    ))}
                  </div>
                </div>
              ))}
          </section>
        )}
      </div>
    </ScrollArea>
  )
}

function SearchiPageView() {
  const { t } = useTranslation()
  const scrollRef = useRef<Ref>(null)
  const { keyword, searchTrigger, selectedTag } = useOutletContext<{ keyword: string, searchTrigger: boolean, selectedTag: number | null, setKeyword: (keyword: string) => void, handleSearch: () => void }>()
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const PAGE_SIZE = 14
  const { data: pagesData, loading: pagesLoading, mutate: setPageData, loadingMore, reload } = useInfiniteScroll(
    async (d) => {
      const pageNumber = d?.pageNumber ?? 1
      const res = await queryPage({
        pageNumber,
        pageSize: PAGE_SIZE,
        keyword,
        tagId: selectedTag,
        startAt: startAt || undefined,
        endAt: endAt || undefined,
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
  }, [searchTrigger, startAt, endAt])

  useWhyDidYouUpdate('SearchiPageView', { pagesData, pagesLoading, loadingMore, keyword, selectedTag })

  const { run: handleDeletePage } = useRequest(deletePage, {
    manual: true,
    onSuccess: (data) => {
      setPageData({ list: pagesData?.list.filter(page => page.id !== data?.id) ?? [] })
    },
  })
  const dateInputClass = 'h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  const clearDateRange = () => {
    setStartAt('')
    setEndAt('')
  }
  return (
    <ScrollArea ref={scrollRef} className="p-4 overflow-auto  h-[calc(100vh-58px)]">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{t('date-range')}</span>
        <input type="date" value={startAt} max={endAt || undefined} onChange={e => setStartAt(e.target.value)} className={dateInputClass} />
        <span>-</span>
        <input type="date" value={endAt} min={startAt || undefined} onChange={e => setEndAt(e.target.value)} className={dateInputClass} />
        {(startAt || endAt) && (
          <button
            type="button"
            onClick={clearDateRange}
            className="h-8 rounded-md px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {t('clear')}
          </button>
        )}
      </div>
      <LoadingWrapper loading={pagesLoading || (!pagesData)}>
        <div className="h-full">
          <CardView pages={pagesData?.list} onPageDelete={handleDeletePage} />
          {loadingMore && <LoadingMore />}
        </div>
      </LoadingWrapper>
    </ScrollArea>
  )
}

function ArchiveHome() {
  const { keyword, selectedTag, setKeyword, handleSearch } = useOutletContext<{ keyword: string, searchTrigger: boolean, selectedTag: number | null, setKeyword: (keyword: string) => void, handleSearch: () => void }>()
  const [showSearchView, setShowSearchView] = useState(false)
  const handleStartSearch = () => {
    if (isNil(keyword) || keyword === '') {
      setShowSearchView(false)
    }
    else {
      setShowSearchView(true)
      handleSearch()
    }
  }
  useEffect(() => {
    setShowSearchView(isNotNil(selectedTag))
  }, [selectedTag])
  return (
    <div className="flex flex-col flex-1">
      <Header keyword={keyword} setKeyword={setKeyword} handleSearch={handleStartSearch}></Header>
      {showSearchView
        ? <SearchiPageView></SearchiPageView>
        : <LibraryHome></LibraryHome>}

    </div>
  )
}

export default ArchiveHome
