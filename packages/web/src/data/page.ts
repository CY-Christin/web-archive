import type { LinkStatus, Page } from '@web-archive/shared/types'
import { isNil } from '@web-archive/shared/utils'
import fetcher from '~/utils/fetcher'

function getPageDetail(id: string): Promise<Page> {
  return fetcher<Page>('/pages/detail', {
    method: 'GET',
    query: {
      id,
    },
  })
}

function deletePage(page: Page): Promise<Page> {
  return fetcher<Page>('/pages/delete_page', {
    method: 'DELETE',
    query: {
      id: page.id.toString(),
    },
  })
}

function queryPage(body: {
  folderId?: string
  pageNumber: number
  pageSize: number
  keyword: string
  tagId: number | null
  startAt?: string
  endAt?: string
  linkStatus?: LinkStatus
  // Ignored while keyword search is active (FTS results are relevance-ranked).
  sort?: 'newest' | 'oldest'
}): Promise<{
    list: Page[]
    total: number
  }> {
  return fetcher<{
    list: Page[]
    total: number
  }>('/pages/query', {
    method: 'POST',
    body,
  })
}

type SearchMatchType = 'title' | 'content' | 'tag'

interface SearchSnippet {
  before: string
  match: string
  after: string
}

interface SearchResultItem extends Pick<Page, 'id' | 'title' | 'pageUrl' | 'pageDesc' | 'screenshotId' | 'folderId' | 'createdAt' | 'linkStatus' | 'lastChecked'> {
  matchType: SearchMatchType
  // Names of all tags this page is bound to (not only the matched one).
  tags: string[]
  // Only present on content matches; empty `match` means the keyword could not
  // be re-located and `after` holds the head of the page text instead.
  snippet?: SearchSnippet
}

function searchPages(body: {
  keyword: string
  pageNumber?: number
  pageSize?: number
}): Promise<{
    list: SearchResultItem[]
    total: number
  }> {
  return fetcher<{
    list: SearchResultItem[]
    total: number
  }>('/pages/search', {
    method: 'POST',
    body,
  })
}

interface RecheckPagesResult {
  checked: number
  cursor: number
  done: boolean
  statuses: Array<{
    id: number
    linkStatus: LinkStatus
    lastChecked: string
  }>
}

// One bounded batch of link-health probes. Loop passing the returned `cursor`
// back until `done` is true (same protocol as /pages/reindex).
function recheckPages(body: {
  folderId?: number
  cursor?: number
  limit?: number
} = {}): Promise<RecheckPagesResult> {
  return fetcher<RecheckPagesResult>('/pages/recheck', {
    method: 'POST',
    body,
  })
}

function getLinkCheckStatus(): Promise<{ lastChecked: string | null }> {
  return fetcher<{ lastChecked: string | null }>('/pages/link_check_status', {
    method: 'GET',
  })
}

// Permanently delete a page that is already in the trash.
function hardDeletePage(id: number): Promise<{ id: number }> {
  return fetcher<{ id: number }>('/pages/hard_delete', {
    method: 'DELETE',
    query: {
      id: id.toString(),
    },
  })
}

function queryDeletedPage(): Promise<Page[]> {
  return fetcher<Page[]>('/pages/query_deleted', {
    method: 'POST',
  })
}

function restorePage(id: number): Promise<boolean> {
  return fetcher<boolean>('/pages/restore_page', {
    method: 'POST',
    body: {
      id,
    },
  })
}

function updatePage(body: {
  id: number
  folderId: number
  title: string
  isShowcased: number
  pageDesc?: string
  pageUrl?: string
}): Promise<Page> {
  return fetcher<Page>('/pages/update_page', {
    method: 'PUT',
    body,
  })
}

function updatePageShowcase(body: {
  id: number
  isShowcased: number
}): Promise<Page> {
  return fetcher<Page>('/pages/update_showcase', {
    method: 'PUT',
    body,
  })
}

function clearDeletedPage(): Promise<boolean> {
  return fetcher<boolean>('/pages/clear_deleted', {
    method: 'DELETE',
  })
}

function getPageScreenshot(screenshotId: string | null) {
  return async () => {
    if (isNil(screenshotId))
      return null
    const res = await fetch(`/api/pages/screenshot?id=${screenshotId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'image/webp',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
    return await res.blob()
  }
}

function getRecentSavePage(): Promise<Page[]> {
  return fetcher<Page[]>('/pages/recent_save', {
    method: 'GET',
  })
}

function queryAllPageIds(folderId: number): Promise<number[]> {
  return fetcher<number[]>('/pages/query_all_page_ids', {
    method: 'POST',
    body: {
      folderId,
    },
  })
}

interface PageVersion {
  id: number
  pageId: number
  title: string
  pageDesc: string
  screenshotId: string | null
  createdAt: string
}

function getPageVersions(pageId: number): Promise<PageVersion[]> {
  return fetcher<PageVersion[]>('/pages/versions', {
    method: 'GET',
    query: {
      pageId: pageId.toString(),
    },
  })
}

export type { PageVersion, SearchMatchType, SearchSnippet, SearchResultItem, RecheckPagesResult }

export {
  getPageDetail,
  deletePage,
  queryPage,
  searchPages,
  recheckPages,
  getLinkCheckStatus,
  updatePage,
  queryDeletedPage,
  restorePage,
  clearDeletedPage,
  hardDeletePage,
  updatePageShowcase,
  getPageScreenshot,
  getRecentSavePage,
  queryAllPageIds,
  getPageVersions,
}
