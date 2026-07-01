import { useInfiniteScroll } from 'ahooks'
import { useRef } from 'react'
import type { Ref } from '@web-archive/shared/components/scroll-area'
import { ScrollArea } from '@web-archive/shared/components/scroll-area'
import LoadingWrapper from '~/components/loading-wrapper'
import CardView from '~/components/card-view'
import EmptyWrapper from '~/components/empty-wrapper'
import { queryShowcase } from '~/data/showcase'
import LoadingMore from '~/components/loading-more'
import PoweredBy from '~/components/powerd-by'

function ShowcaseFolderPage() {
  const scrollRef = useRef<Ref>(null)
  const PAGE_SIZE = 14
  const { data: pagesData, loading: pagesLoading, loadingMore } = useInfiniteScroll(
    async (d) => {
      const pageNumber = d?.pageNumber ?? 1
      const res = await queryShowcase({
        pageNumber,
        pageSize: PAGE_SIZE,
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

  return (
    <div className="flex h-screen flex-1 flex-col bg-background">
      <div className="flex justify-end border-b border-border bg-background/80 px-2 py-2 backdrop-blur">
        <PoweredBy />
      </div>
      <ScrollArea ref={scrollRef} className="flex-1 overflow-auto">
        <div className="p-6">
          <LoadingWrapper loading={pagesLoading || (!pagesData)}>
            <EmptyWrapper empty={pagesData?.list.length === 0}>
              <CardView pages={pagesData?.list} onPageDelete={() => { }} />
            </EmptyWrapper>
            {loadingMore && <LoadingMore />}
          </LoadingWrapper>
        </div>
      </ScrollArea>
    </div>
  )
}

export default ShowcaseFolderPage
