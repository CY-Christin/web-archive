import { useContext, useMemo, useRef, useState } from 'react'
import { useInfiniteScroll, useMemoizedFn, useRequest } from 'ahooks'
import { useSearchParams } from 'react-router-dom'
import type { LinkStatus, Page } from '@web-archive/shared/types'
import { Skeleton } from '@web-archive/shared/components/skeleton'
import type React from 'react'
import CardView from './card-view'
import ListView from './list-view'
import ArchiveFilterBar from './archive-filter-bar'
import EmptyWrapper from './empty-wrapper'
import LoadingMore from './loading-more'
import type { RecheckPagesResult } from '~/data/page'
import { deletePage, getLinkCheckStatus, getPageDetail, queryPage, recheckPages } from '~/data/page'
import AppContext from '~/store/app'
import TagContext from '~/store/tag'
import { useNavigate } from '~/router'
import emitter from '~/utils/emitter'

const PAGE_SIZE = 24

function parseNumericParam(value: string | null): number | undefined {
  if (value == null || value === '' || Number.isNaN(Number(value)))
    return undefined
  return Number(value)
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-card border border-border bg-surface">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="flex flex-col gap-[9px] px-4 pb-[15px] pt-3.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-[18px] py-3.5">
          <Skeleton className="h-12 w-[76px] shrink-0 rounded-[9px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

// The 全部归档 browse surface: filter bar + infinite-scrolled card grid / list.
// Rendered by /archive (all pages, ?folder= filterable) and /folder/:slug
// (folderId prop pins the folder); ?tag= filters by tag on both.
function ArchiveView({ folderId }: { folderId?: number }) {
  const navigate = useNavigate()
  const { view } = useContext(AppContext)
  const { tagCache } = useContext(TagContext)
  const [searchParams, setSearchParams] = useSearchParams()

  const tagId = parseNumericParam(searchParams.get('tag')) ?? null
  const effectiveFolderId = folderId ?? parseNumericParam(searchParams.get('folder'))
  const activeTag = useMemo(() => tagCache?.find(tag => tag.id === tagId), [tagCache, tagId])

  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [linkStatus, setLinkStatus] = useState<LinkStatus | undefined>(undefined)

  const { data: pagesData, loading: pagesLoading, loadingMore, mutate: setPagesData, reload } = useInfiniteScroll(
    async (d) => {
      const pageNumber = d?.pageNumber ?? 1
      const res = await queryPage({
        folderId: effectiveFolderId != null ? String(effectiveFolderId) : undefined,
        pageNumber,
        pageSize: PAGE_SIZE,
        keyword: '',
        tagId,
        linkStatus,
        sort,
      })
      return {
        list: res.list ?? [],
        pageNumber: pageNumber + 1,
        total: res.total,
      }
    },
    {
      target: () => document.getElementById('main-scroll'),
      isNoMore: (d) => {
        if (!d)
          return false
        return d.list.length >= d.total || d.pageNumber > Math.ceil(d.total / PAGE_SIZE)
      },
      reloadDeps: [effectiveFolderId, tagId, linkStatus, sort],
    },
  )

  const { run: runDeletePage } = useRequest(deletePage, {
    manual: true,
    onSuccess: (deleted) => {
      setPagesData(old => old
        ? {
            ...old,
            list: old.list.filter(page => page.id !== deleted?.id),
            total: Math.max(0, old.total - 1),
          }
        : old)
      // Sidebar / folder dropdown page counts include this page.
      emitter.emit('refreshSideBar')
    },
  })
  const handleDelete = useMemoizedFn((id: number) => {
    const target = pagesData?.list.find(page => page.id === id)
    if (target)
      runDeletePage(target)
  })

  // The edit dialog saves through its own request and doesn't report what
  // changed, so re-sync the single row when it closes.
  const handleEdited = useMemoizedFn(async (id: number) => {
    const prev = pagesData?.list.find(page => page.id === id)
    const updated = await getPageDetail(String(id)).catch(() => null)
    if (!updated)
      return
    setPagesData((old) => {
      if (!old)
        return old
      if (effectiveFolderId != null && Number(updated.folderId) !== Number(effectiveFolderId)) {
        return {
          ...old,
          list: old.list.filter(page => page.id !== id),
          total: Math.max(0, old.total - 1),
        }
      }
      return { ...old, list: old.list.map(page => (page.id === id ? { ...page, ...updated } : page)) }
    })
    if (prev && prev.folderId !== updated.folderId)
      emitter.emit('refreshSideBar')
  })

  const handleItemClick = useMemoizedFn((page: Page, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey)
      window.open(`/#/page/${page.id}`, '_blank')
    else
      navigate('/page/:slug', { params: { slug: String(page.id) } })
  })

  const handleFolderChange = useMemoizedFn((id?: number) => {
    if (folderId != null) {
      // Folder route: switch routes so the sidebar active state follows,
      // carrying the active ?tag= filter along (as the /archive branch does).
      const search = tagId != null ? `?tag=${tagId}` : ''
      if (id == null)
        navigate({ pathname: '/archive', search })
      else
        navigate({ pathname: '/folder/:slug', search }, { params: { slug: String(id) } })
      return
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id == null)
        next.delete('folder')
      else
        next.set('folder', String(id))
      return next
    })
  })

  const handleClearTag = useMemoizedFn(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('tag')
      return next
    })
  })

  // Manual link-health recheck: loop cursor batches until the server says done,
  // patching statuses into the visible list live (see /pages/recheck protocol).
  const { data: linkCheck, refresh: refreshLinkCheck } = useRequest(getLinkCheckStatus)
  const [checking, setChecking] = useState(false)
  const checkingRef = useRef(false)

  const applyStatuses = (statuses: RecheckPagesResult['statuses']) => {
    if (statuses.length === 0)
      return
    const byId = new Map(statuses.map(status => [status.id, status]))
    setPagesData((old) => {
      if (!old)
        return old
      return {
        ...old,
        list: old.list.map((page) => {
          const status = byId.get(page.id)
          return status ? { ...page, linkStatus: status.linkStatus, lastChecked: status.lastChecked } : page
        }),
      }
    })
  }

  const handleRecheck = useMemoizedFn(async () => {
    if (checkingRef.current)
      return
    checkingRef.current = true
    setChecking(true)
    try {
      let cursor = 0
      while (true) {
        const res = await recheckPages({ cursor, folderId: effectiveFolderId })
        applyStatuses(res.statuses)
        if (res.done)
          break
        cursor = res.cursor
      }
      // Memberships may have changed when a link-status filter is active.
      reload()
    }
    finally {
      checkingRef.current = false
      setChecking(false)
      refreshLinkCheck()
    }
  })

  const initialLoading = pagesLoading || !pagesData

  return (
    <div className="mx-auto max-w-[1400px] animate-fade-up">
      <ArchiveFilterBar
        total={pagesData?.total}
        folderId={effectiveFolderId}
        onFolderChange={handleFolderChange}
        sort={sort}
        onSortChange={setSort}
        linkStatus={linkStatus}
        onLinkStatusChange={setLinkStatus}
        activeTag={activeTag}
        onClearTag={handleClearTag}
        lastChecked={linkCheck?.lastChecked ?? null}
        checking={checking}
        onRecheck={handleRecheck}
      />

      {initialLoading
        ? (view === 'card' ? <CardGridSkeleton /> : <ListSkeleton />)
        : (
            <EmptyWrapper empty={pagesData?.list.length === 0}>
              {view === 'card'
                ? <CardView pages={pagesData?.list} onDelete={handleDelete} onEdited={handleEdited} />
                : <ListView pages={pagesData?.list} onItemClick={handleItemClick} onDelete={handleDelete} />}
            </EmptyWrapper>
          )}
      {loadingMore && <LoadingMore />}
    </div>
  )
}

export default ArchiveView
