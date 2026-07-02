import type { D1Database } from '@cloudflare/workers-types/experimental'
import { selectAllPageCount, selectPageTotalCount } from './page'
import { selectAllFolders } from './folder'

async function getHomeChartData(DB: D1Database) {
  const folderList = await selectAllFolders(DB)
  const folderPageCountList = await Promise.all(folderList.map(async (folder) => {
    const pageCount = await selectPageTotalCount(DB, { folderId: folder.id })
    return {
      id: folder.id,
      name: folder.name,
      pageCount: pageCount as number,
    }
  }))

  const sortedFolderPageCountList = folderPageCountList
    .sort((a, b) => b.pageCount - a.pageCount)
    .slice(0, 5)

  const allPageCount = await selectAllPageCount(DB)
  return {
    folders: sortedFolderPageCountList,
    all: allPageCount,
  }
}

// R2 keys owned by page HTML snapshots vs screenshots, for classifying bucket
// usage. Includes soft-deleted pages and archived versions — their objects are
// still in the bucket. Keys owned by neither (e.g. other projects sharing the
// bucket) are counted only into the grand totals by the caller.
async function getBucketKeyOwners(DB: D1Database) {
  const [pageRows, versionRows] = await DB.batch<{ contentUrl: string | null, screenshotId: string | null }>([
    DB.prepare(`SELECT contentUrl, screenshotId FROM pages`),
    DB.prepare(`SELECT contentUrl, screenshotId FROM page_versions`),
  ])
  const contentUrls = new Set<string>()
  const screenshotIds = new Set<string>()
  for (const row of [...pageRows.results, ...versionRows.results]) {
    if (row.contentUrl)
      contentUrls.add(row.contentUrl)
    if (row.screenshotId)
      screenshotIds.add(row.screenshotId)
  }
  return { contentUrls, screenshotIds }
}

export {
  getHomeChartData,
  getBucketKeyOwners,
}
