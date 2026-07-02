import type { Page } from '@web-archive/shared/types'
import fetcher from '~/utils/fetcher'

function queryShowcase(options: {
  pageNumber: number
  pageSize: number
}): Promise<{
    list: Page[]
    total: number
  }> {
  return fetcher<{
    list: Page[]
    total: number
  }>('/showcase/query', {
    method: 'POST',
    body: options,
  })
}

function getNextShowcasePageId(pageId: number) {
  return fetcher<number>('/showcase/next_id', {
    method: 'GET',
    query: {
      id: String(pageId),
    },
  })
}

export { queryShowcase, getNextShowcasePageId }
