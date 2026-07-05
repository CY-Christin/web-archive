// Result of the manual link-health probe (POST /api/pages/recheck).
// 'unknown' = the probe couldn't reach a conclusion (blocked, timeout, transient error).
type LinkStatus = 'live' | 'dead' | 'redirect' | 'unknown'

type Page = {
  id: number
  title: string
  contentUrl: string
  pageUrl: string
  folderId: number
  pageDesc: string
  screenshotId: string | null
  isDeleted: number
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  isShowcased: number
  // null until the page's original URL has been probed at least once.
  linkStatus: LinkStatus | null
  // D1 DATETIME string 'YYYY-MM-DD HH:MM:SS' (UTC), null until first probed.
  lastChecked: string | null
  // Sub-classification of an 'unknown' linkStatus: 'cf-blocked' = the probe hit a
  // Cloudflare challenge/block page. Null for every other status or reason.
  linkStatusReason: 'cf-blocked' | null
}

type Folder = {
  id: number
  name: string
  isDeleted: number
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  // Number of non-deleted pages in the folder; only populated by GET /api/folders/all.
  pageCount?: number
}

type Tag = {
  id: number
  name: string
  color: string
  icon?: string | null
  pageIds: Array<number>
  createdAt: Date
  updatedAt: Date
}

export type { Page, Folder, Tag, LinkStatus }
