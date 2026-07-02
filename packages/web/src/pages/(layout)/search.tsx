import { Skeleton } from '@web-archive/shared/components/skeleton'
import { useRequest } from 'ahooks'
import { useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { SearchResultItem } from '~/data/page'
import { searchPages } from '~/data/page'
import SearchResultCard from '~/components/search-result-card'
import { useNavigate } from '~/router'

const PAGE_SIZE = 50

function SearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const q = (searchParams.get('q') ?? '').trim()

  const [list, setList] = useState<SearchResultItem[]>([])
  const [total, setTotal] = useState(0)
  // Last page number already merged into `list`.
  const pageNumberRef = useRef(1)

  const { loading: loadingMore, run: loadMore, cancel: cancelLoadMore } = useRequest(
    () => searchPages({ keyword: q, pageNumber: pageNumberRef.current + 1, pageSize: PAGE_SIZE }),
    {
      manual: true,
      onSuccess: (data) => {
        pageNumberRef.current += 1
        setList(prev => [...prev, ...data.list])
        setTotal(data.total)
      },
    },
  )

  const { loading } = useRequest(
    // Empty keyword would be a 400 from the server; resolve to zero results
    // so a bare /search URL still renders the empty state.
    async () => q.length > 0
      ? searchPages({ keyword: q, pageNumber: 1, pageSize: PAGE_SIZE })
      : { list: [], total: 0 },
    {
      refreshDeps: [q],
      onBefore: () => {
        // Drop any in-flight "load more" of the previous keyword.
        cancelLoadMore()
        pageNumberRef.current = 1
        setList([])
        setTotal(0)
      },
      onSuccess: (data) => {
        setList(data.list)
        setTotal(data.total)
      },
    },
  )

  const hasMore = list.length < total

  return (
    <div className="mx-auto max-w-[900px] animate-fade-up">
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <span className="text-[15px] font-extrabold tracking-[-0.01em]">
          <Trans
            i18nKey="search-found-results"
            values={{ total }}
            components={{ num: <span className="font-mono font-semibold" /> }}
          />
        </span>
        <span className="font-mono text-xs text-faint">{t('search-scope-hint')}</span>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {['sk-1', 'sk-2', 'sk-3'].map(key => (
            <div key={key} className="flex flex-col gap-[9px] rounded-result border border-border bg-surface px-[18px] py-4">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="flex flex-col gap-3">
          {list.map(item => (
            <SearchResultCard
              key={item.id}
              item={item}
              onClick={() => navigate('/page/:slug', { params: { slug: String(item.id) } })}
            />
          ))}
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className="py-[72px] text-center">
          <div className="mb-1.5 text-[15px] font-bold text-muted-foreground">{t('search-empty-title')}</div>
          <div className="text-[13px] text-faint">{t('search-empty-desc')}</div>
        </div>
      )}

      {!loading && hasMore && list.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            className="rounded-btn border border-border-strong bg-surface px-[13px] py-[7px] text-[12.5px] font-semibold hover:border-primary hover:text-primary disabled:cursor-default disabled:text-faint disabled:hover:border-border-strong"
            onClick={loadMore}
          >
            {loadingMore ? t('loading-more') : t('load-more')}
          </button>
        </div>
      )}
    </div>
  )
}

export default SearchPage
