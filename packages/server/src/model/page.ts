import { isNotNil } from '@web-archive/shared/utils'
import type { TagBindRecord } from './tag'
import { generateUpdateTagSql } from './tag'
import type { LinkStatus, Page } from '~/sql/types'
import { removeBucketFile } from '~/utils/file'
import { FTS_MIN_KEYWORD_LEN, ftsMatchQuery } from '~/utils/htmlToText'

interface PageQueryFilters {
  folderId?: number
  keyword?: string
  tagId?: number
  // ISO date strings (inclusive) filtering on pages.createdAt.
  startAt?: string
  endAt?: string
  linkStatus?: LinkStatus
}

// Build the shared FROM + WHERE for page listing/counting.
// Keyword search joins the FTS index (title + description + full page text):
//   - >= 3 chars  -> `pages_fts MATCH` (fast, relevance-ranked; trigram needs 3 chars)
//   - 1-2 chars   -> LIKE over the FTS-stored columns, so short CJK words (e.g. 续费,
//                    会员) still match page content, which trigram alone cannot do.
// The FTS table must be referenced by name (not an alias) in a MATCH clause.
// Returns whether MATCH was used so callers can order by relevance vs. recency.
function buildPageQuery(filters: PageQueryFilters, selectClause: string) {
  const { folderId, keyword, tagId, startAt, endAt, linkStatus } = filters
  const trimmedKeyword = keyword?.trim()
  const hasKeyword = !!trimmedKeyword
  const useFts = hasKeyword && trimmedKeyword!.length >= FTS_MIN_KEYWORD_LEN

  let sql = `${selectClause} FROM pages p`
  const where: string[] = ['p.isDeleted = 0']
  const bindParams: (number | string)[] = []

  if (hasKeyword) {
    sql += ` JOIN pages_fts ON p.id = pages_fts.rowid`
    if (useFts) {
      where.push(`pages_fts MATCH ?`)
      bindParams.push(ftsMatchQuery(trimmedKeyword!))
    }
    else {
      const like = `%${trimmedKeyword}%`
      where.push(`(pages_fts.content LIKE ? OR pages_fts.title LIKE ? OR pages_fts.pageDesc LIKE ?)`)
      bindParams.push(like, like, like)
    }
  }

  if (isNotNil(folderId)) {
    where.push(`p.folderId = ?`)
    bindParams.push(folderId)
  }

  if (isNotNil(tagId)) {
    where.push(`p.id IN (SELECT value FROM json_each((SELECT pageIdDict FROM tags WHERE id = ?)))`)
    bindParams.push(tagId)
  }

  if (isNotNil(linkStatus)) {
    where.push(`p.linkStatus = ?`)
    bindParams.push(linkStatus)
  }

  // Compare on calendar date via date() so it works regardless of whether
  // createdAt is stored as "YYYY-MM-DD HH:MM:SS" (SQLite CURRENT_TIMESTAMP) or
  // ISO 8601. startAt/endAt are inclusive 'YYYY-MM-DD' bounds.
  if (startAt) {
    where.push(`date(p.createdAt) >= date(?)`)
    bindParams.push(startAt)
  }

  if (endAt) {
    where.push(`date(p.createdAt) <= date(?)`)
    bindParams.push(endAt)
  }

  sql += ` WHERE ${where.join(' AND ')}`
  return { sql, bindParams, useFts }
}

async function selectPageTotalCount(DB: D1Database, options: PageQueryFilters) {
  const { sql, bindParams } = buildPageQuery(options, 'SELECT COUNT(*) as count')
  const result = await DB.prepare(sql).bind(...bindParams).first()
  return result.count
}

async function selectAllPageCount(DB: D1Database) {
  const sql = `
    SELECT COUNT(*) as count FROM pages
    WHERE isDeleted = 0
  `
  const result = await DB.prepare(sql).first()
  return result.count
}

async function queryPage(DB: D1Database, options: PageQueryFilters & { pageNumber?: number, pageSize?: number, sort?: 'newest' | 'oldest' }) {
  const { pageNumber, pageSize, sort } = options
  const selectClause = `
    SELECT
      p.id,
      p.title,
      p.contentUrl,
      p.pageUrl,
      p.folderId,
      p.pageDesc,
      p.screenshotId,
      p.createdAt,
      p.updatedAt,
      p.isShowcased,
      p.linkStatus,
      p.linkStatusReason,
      p.lastChecked
  `
  const { sql: baseSql, bindParams, useFts } = buildPageQuery(options, selectClause)

  // FTS matches are ordered by relevance; plain listing follows `sort` (newest-first default).
  let sql = `${baseSql} ORDER BY ${useFts ? 'rank' : `p.createdAt ${sort === 'oldest' ? 'ASC' : 'DESC'}`}`

  if (isNotNil(pageNumber) && isNotNil(pageSize)) {
    sql += ` LIMIT ? OFFSET ?`
    bindParams.push(pageSize)
    bindParams.push((pageNumber - 1) * pageSize)
  }

  const sqlResult = await DB.prepare(sql).bind(...bindParams).all<Page>()
  if (sqlResult.error) {
    throw sqlResult.error
  }
  return sqlResult.results
}

// Replace the FTS row for a page (title + description + extracted content).
// Used on upload and by the reindex endpoint. rowid is aligned to pages.id.
async function upsertPageFts(DB: D1Database, options: { pageId: number, title: string, pageDesc: string, content: string }) {
  const { pageId, title, pageDesc, content } = options
  const del = DB.prepare(`DELETE FROM pages_fts WHERE rowid = ?`).bind(pageId)
  const ins = DB
    .prepare(`INSERT INTO pages_fts (rowid, title, pageDesc, content) VALUES (?, ?, ?, ?)`)
    .bind(pageId, title, pageDesc, content)
  const result = await DB.batch([del, ins])
  return result.every(r => r.success)
}

// Remove FTS rows for hard-deleted pages.
async function deletePageFtsByIds(DB: D1Database, pageIds: number[]) {
  if (pageIds.length === 0)
    return true
  const placeholders = pageIds.map(() => '?').join(', ')
  const result = await DB.prepare(`DELETE FROM pages_fts WHERE rowid IN (${placeholders})`).bind(...pageIds).run()
  return result.success
}

// Pages to (re)index, walked by ascending id cursor so the reindex endpoint can
// process the backlog in bounded batches.
async function queryPagesForReindex(DB: D1Database, options: { cursor: number, limit: number }) {
  const { cursor, limit } = options
  const sql = `SELECT id, title, contentUrl, pageDesc FROM pages WHERE isDeleted = 0 AND id > ? ORDER BY id ASC LIMIT ?`
  const result = await DB.prepare(sql).bind(cursor, limit).all<Pick<Page, 'id' | 'title' | 'contentUrl' | 'pageDesc'>>()
  if (result.error) {
    throw result.error
  }
  return result.results
}

// Pages whose original URL should be probed for link health, walked by
// ascending id cursor (bounded batches keep each request far below the
// Worker's 50-subrequest budget).
async function queryPagesForRecheck(DB: D1Database, options: { cursor: number, limit: number, folderId?: number }) {
  const { cursor, limit, folderId } = options
  let sql = `SELECT id, pageUrl FROM pages WHERE isDeleted = 0 AND id > ?`
  const bindParams: number[] = [cursor]
  if (isNotNil(folderId)) {
    sql += ` AND folderId = ?`
    bindParams.push(folderId)
  }
  sql += ` ORDER BY id ASC LIMIT ?`
  bindParams.push(limit)
  const result = await DB.prepare(sql).bind(...bindParams).all<Pick<Page, 'id' | 'pageUrl'>>()
  if (result.error) {
    throw result.error
  }
  return result.results
}

// Persist probe results, then read the rows back so the response carries the
// exact lastChecked value D1 stored (CURRENT_TIMESTAMP is computed in SQL).
async function updatePagesLinkStatus(DB: D1Database, updates: Array<{ id: number, linkStatus: LinkStatus, linkStatusReason: Page['linkStatusReason'] }>) {
  if (updates.length === 0)
    return []
  const stmt = DB.prepare(`UPDATE pages SET linkStatus = ?, linkStatusReason = ?, lastChecked = CURRENT_TIMESTAMP WHERE id = ?`)
  await DB.batch(updates.map(update => stmt.bind(update.linkStatus, update.linkStatusReason, update.id)))

  const idsJson = JSON.stringify(updates.map(update => update.id))
  const rows = await DB
    .prepare(`SELECT id, linkStatus, linkStatusReason, lastChecked FROM pages WHERE id IN (SELECT value FROM json_each(?))`)
    .bind(idsJson)
    .all<Pick<Page, 'id' | 'linkStatus' | 'linkStatusReason' | 'lastChecked'>>()
  if (rows.error) {
    throw rows.error
  }
  return rows.results
}

// Pages of one folder to run AI folder classification over, walked by ascending
// id cursor (same bounded-batch protocol as recheck; each page costs one AI
// call, so batches stay small). Scoped to a folder on purpose: the user runs
// "AI 整理" on a selected (e.g. uncategorized) folder, already-sorted folders
// must not be touched.
async function queryPagesForClassify(DB: D1Database, options: { folderId: number, cursor: number, limit: number }) {
  const { folderId, cursor, limit } = options
  const sql = `SELECT id, title, pageDesc, folderId FROM pages WHERE isDeleted = 0 AND folderId = ? AND id > ? ORDER BY id ASC LIMIT ?`
  const result = await DB.prepare(sql).bind(folderId, cursor, limit).all<Pick<Page, 'id' | 'title' | 'pageDesc' | 'folderId'>>()
  if (result.error) {
    throw result.error
  }
  return result.results
}

// Move a page to another folder (used by AI folder classification).
async function updatePageFolderId(DB: D1Database, pageId: number, folderId: number) {
  const result = await DB.prepare(`UPDATE pages SET folderId = ? WHERE id = ?`).bind(folderId, pageId).run()
  return result.success
}

// Most recent probe time across the archive (null = never checked anything).
async function getMaxLastChecked(DB: D1Database) {
  const row = await DB
    .prepare(`SELECT MAX(lastChecked) as lastChecked FROM pages WHERE isDeleted = 0`)
    .first<{ lastChecked: string | null }>()
  return row?.lastChecked ?? null
}

// Non-deleted page ids matching the keyword in either the title or the body
// (pageDesc + extracted content), most relevant first. Same >=3-char trigram /
// short-CJK LIKE split as buildPageQuery; LIKE fallback orders by recency
// because there is no FTS rank to use.
async function searchPageIdsByKeyword(DB: D1Database, keyword: string, scope: 'title' | 'content') {
  const kw = keyword.trim()
  const useFts = kw.length >= FTS_MIN_KEYWORD_LEN
  let sql = `SELECT p.id FROM pages p JOIN pages_fts ON p.id = pages_fts.rowid WHERE p.isDeleted = 0 AND `
  const bindParams: string[] = []
  if (useFts) {
    // FTS5 column filter restricts the match to given columns; pageDesc hits
    // are grouped with content (a description hit is a body hit, not a title hit).
    sql += `pages_fts MATCH ? ORDER BY rank`
    bindParams.push(scope === 'title'
      ? `title : ${ftsMatchQuery(kw)}`
      : `{pageDesc content} : ${ftsMatchQuery(kw)}`)
  }
  else {
    // Escape LIKE metacharacters so a literal % / _ keyword doesn't wildcard-match everything.
    const like = `%${kw.replace(/[\\%_]/g, m => `\\${m}`)}%`
    if (scope === 'title') {
      sql += `pages_fts.title LIKE ? ESCAPE '\\' ORDER BY p.createdAt DESC`
      bindParams.push(like)
    }
    else {
      sql += `(pages_fts.pageDesc LIKE ? ESCAPE '\\' OR pages_fts.content LIKE ? ESCAPE '\\') ORDER BY p.createdAt DESC`
      bindParams.push(like, like)
    }
  }
  const result = await DB.prepare(sql).bind(...bindParams).all<{ id: number }>()
  if (result.error) {
    throw result.error
  }
  return result.results.map(row => row.id)
}

// Of the candidate ids (e.g. expanded from tags.pageIdDict, which may contain
// soft-deleted or purged pages), keep only existing non-deleted ones, newest first.
async function filterLivePageIds(DB: D1Database, pageIds: number[]) {
  if (pageIds.length === 0)
    return []
  const result = await DB
    .prepare(`SELECT id FROM pages WHERE isDeleted = 0 AND id IN (SELECT value FROM json_each(?)) ORDER BY createdAt DESC`)
    .bind(JSON.stringify(pageIds))
    .all<{ id: number }>()
  if (result.error) {
    throw result.error
  }
  return result.results.map(row => row.id)
}

// Page columns for a search-result window (no contentUrl; results link to /page/:id).
type SearchResultPageRow = Pick<Page, 'id' | 'title' | 'pageUrl' | 'pageDesc' | 'screenshotId' | 'folderId' | 'createdAt' | 'linkStatus' | 'linkStatusReason' | 'lastChecked'>

async function getSearchPagesByIds(DB: D1Database, pageIds: number[]) {
  if (pageIds.length === 0)
    return []
  const result = await DB
    .prepare(`
      SELECT id, title, pageUrl, pageDesc, screenshotId, folderId, createdAt, linkStatus, linkStatusReason, lastChecked
      FROM pages
      WHERE isDeleted = 0 AND id IN (SELECT value FROM json_each(?))
    `)
    .bind(JSON.stringify(pageIds))
    .all<SearchResultPageRow>()
  if (result.error) {
    throw result.error
  }
  return result.results
}

// Extracted page text for snippet building (only fetched for content matches
// in the current result window, so the payload stays bounded).
async function getFtsContentByIds(DB: D1Database, pageIds: number[]) {
  if (pageIds.length === 0)
    return []
  const result = await DB
    .prepare(`SELECT rowid as id, content FROM pages_fts WHERE rowid IN (SELECT value FROM json_each(?))`)
    .bind(JSON.stringify(pageIds))
    .all<{ id: number, content: string }>()
  if (result.error) {
    throw result.error
  }
  return result.results
}

async function queryPageByUrl(DB: D1Database, pageUrl: string) {
  const sql = `SELECT * FROM pages WHERE pageUrl = ? AND isDeleted = 0`
  const result = await DB.prepare(sql).bind(pageUrl).all<Page>()
  return result.results
}

async function selectDeletedPageTotalCount(DB: D1Database) {
  const sql = `
    SELECT COUNT(*) as count FROM pages
    WHERE isDeleted = 1
  `
  const result = await DB.prepare(sql).first()
  return result.count
}

async function queryDeletedPage(DB: D1Database) {
  const sql = `
    SELECT
      id,
      title,
      contentUrl,
      pageUrl,
      folderId,
      pageDesc,
      createdAt,
      updatedAt,
      deletedAt,
      linkStatus,
      lastChecked
    FROM pages
    WHERE isDeleted = 1
    ORDER BY updatedAt DESC
  `
  const result = await DB.prepare(sql).all<Page>()
  return result.results
}

async function deletePageById(DB: D1Database, pageId: number) {
  const sql = `
    UPDATE pages
    SET 
      isDeleted = 1,
      deletedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  const result = await DB.prepare(sql).bind(pageId).run()
  return result.success
}

async function restorePage(DB: D1Database, id: number) {
  const sql = `
    UPDATE pages
    SET 
      isDeleted = 0,
      deletedAt = NULL
    WHERE id = ?
  `
  const result = await DB.prepare(sql).bind(id).run()
  return result.success && result.meta.changes > 0
}

async function getPageById(DB: D1Database, options: { id: number, isDeleted?: boolean }) {
  const { id, isDeleted } = options
  const sql = `
    SELECT 
      *
    FROM pages
    WHERE id = ?
  `
  const page = await DB.prepare(sql).bind(id).first<Page>()
  if (isNotNil(isDeleted) && page?.isDeleted !== Number(isDeleted)) {
    return null
  }
  return page
}

interface InsertPageOptions {
  title: string
  pageDesc: string
  pageUrl: string
  contentUrl: string
  folderId: number
  screenshotId?: string
  isShowcased: boolean
}

async function insertPage(DB: D1Database, pageOptions: InsertPageOptions) {
  const { title, pageDesc, pageUrl, contentUrl, folderId, screenshotId = null, isShowcased } = pageOptions
  const insertResult = await DB
    .prepare(
      'INSERT INTO pages (title, pageDesc, pageUrl, contentUrl, folderId, screenshotId, isShowcased) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(title, pageDesc, pageUrl, contentUrl, folderId, screenshotId, isShowcased)
    .run()
  return insertResult.meta.last_row_id
}

// Permanently remove pages: their R2 objects (current capture + archived
// versions), pages_fts rows, page_versions rows and the pages rows themselves.
// Id lists go through json_each to stay within D1's bound-parameter cap.
async function hardDeletePages(DB: D1Database, BUCKET: R2Bucket, pageIds: number[]) {
  if (pageIds.length === 0)
    return true
  const idsJson = JSON.stringify(pageIds)

  const [pageRows, versionRows] = await DB.batch<{ contentUrl: string | null, screenshotId: string | null }>([
    DB.prepare(`SELECT contentUrl, screenshotId FROM pages WHERE id IN (SELECT value FROM json_each(?))`).bind(idsJson),
    DB.prepare(`SELECT contentUrl, screenshotId FROM page_versions WHERE pageId IN (SELECT value FROM json_each(?))`).bind(idsJson),
  ])
  const deleteBucketKeys = [...pageRows.results, ...versionRows.results]
    .map(row => [row.contentUrl, row.screenshotId])
    .flat()
    .filter(isNotNil)
  await removeBucketFile(BUCKET, deleteBucketKeys)

  const result = await DB.batch([
    DB.prepare(`DELETE FROM page_versions WHERE pageId IN (SELECT value FROM json_each(?))`).bind(idsJson),
    DB.prepare(`DELETE FROM pages_fts WHERE rowid IN (SELECT value FROM json_each(?))`).bind(idsJson),
    DB.prepare(`DELETE FROM pages WHERE id IN (SELECT value FROM json_each(?))`).bind(idsJson),
  ])
  return result.every(r => r.success)
}

async function clearDeletedPage(DB: D1Database, BUCKET: R2Bucket) {
  const deletePageResult = await DB.prepare(`SELECT id FROM pages WHERE isDeleted = 1`).all<{ id: number }>()
  if (deletePageResult.error) {
    return false
  }
  return await hardDeletePages(DB, BUCKET, deletePageResult.results.map(page => page.id))
}

// Trash retention: pages soft-deleted more than 30 days ago are purged for good.
// Called lazily from the trash listing endpoint (no cron available on Pages).
// Bounded batch so a huge backlog can't dominate a single trash view; the
// remainder is picked up by subsequent calls.
const PURGE_BATCH_SIZE = 50
async function purgeExpiredDeletedPages(DB: D1Database, BUCKET: R2Bucket) {
  const expired = await DB
    .prepare(`SELECT id FROM pages WHERE isDeleted = 1 AND deletedAt < datetime('now', '-30 days') LIMIT ?`)
    .bind(PURGE_BATCH_SIZE)
    .all<{ id: number }>()
  if (expired.error) {
    throw expired.error
  }
  return await hardDeletePages(DB, BUCKET, expired.results.map(page => page.id))
}

async function queryRecentSavePage(DB: D1Database) {
  const sql = `
    SELECT * FROM pages WHERE isDeleted = 0 ORDER BY createdAt DESC LIMIT 20
  `
  const result = await DB.prepare(sql).all<Page>()
  return result.results
}

interface UpdatePageOptions {
  id: number
  folderId: number
  title: string
  isShowcased: boolean
  pageDesc: string
  pageUrl: string
  bindTags?: Array<TagBindRecord>
  unbindTags?: Array<TagBindRecord>
}

async function updatePage(DB: D1Database, options: UpdatePageOptions) {
  const { id, folderId, title, isShowcased, pageDesc, pageUrl, bindTags = [], unbindTags = [] } = options
  const sql = `
    UPDATE pages
    SET
      folderId = ?,
      title = ?,
      isShowcased = ?,
      pageDesc = ?,
      pageUrl = ?
    WHERE id = ?
  `
  const updateSql = DB.prepare(sql).bind(folderId, title, isShowcased, pageDesc, pageUrl, id)
  // Keep the FTS metadata in sync. Content (from R2) is unchanged on edit, so we
  // only touch title/pageDesc; affects 0 rows if the page isn't indexed yet.
  const updateFtsSql = DB.prepare(`UPDATE pages_fts SET title = ?, pageDesc = ? WHERE rowid = ?`).bind(title, pageDesc, id)
  const updateSqlList = generateUpdateTagSql(DB, bindTags, unbindTags)
  const result = await DB.batch([updateSql, updateFtsSql, ...updateSqlList])
  return result.every(r => r.success)
}

// Overwrite just the description (used by the post-upload AI auto-description).
// Keeps the FTS pageDesc column in sync; affects 0 rows if not yet indexed.
async function updatePageDescription(DB: D1Database, pageId: number, pageDesc: string) {
  const updatePageSql = DB.prepare(`UPDATE pages SET pageDesc = ? WHERE id = ?`).bind(pageDesc, pageId)
  const updateFtsSql = DB.prepare(`UPDATE pages_fts SET pageDesc = ? WHERE rowid = ?`).bind(pageDesc, pageId)
  const result = await DB.batch([updatePageSql, updateFtsSql])
  return result.every(r => r.success)
}

// Archive the current content of a page into page_versions (called before the
// page row is overwritten with a newer capture in "new version" save mode).
async function insertPageVersion(DB: D1Database, page: Pick<Page, 'id' | 'title' | 'pageDesc' | 'contentUrl' | 'screenshotId' | 'createdAt'>) {
  const sql = `
    INSERT INTO page_versions (pageId, title, pageDesc, contentUrl, screenshotId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  const result = await DB
    .prepare(sql)
    .bind(page.id, page.title, page.pageDesc, page.contentUrl, page.screenshotId, page.createdAt)
    .run()
  return result.success
}

// Replace a page's latest-version content pointers in place (used by both the
// "overwrite" and "new version" save modes after the new file is in R2).
async function updatePageContent(DB: D1Database, options: { id: number, title: string, pageDesc: string, contentUrl: string, screenshotId?: string | null }) {
  const { id, title, pageDesc, contentUrl, screenshotId = null } = options
  const sql = `
    UPDATE pages
    SET title = ?, pageDesc = ?, contentUrl = ?, screenshotId = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  const result = await DB.prepare(sql).bind(title, pageDesc, contentUrl, screenshotId, id).run()
  return result.success
}

async function queryPageVersions(DB: D1Database, pageId: number) {
  const sql = `
    SELECT id, pageId, title, pageDesc, screenshotId, createdAt
    FROM page_versions
    WHERE pageId = ?
    ORDER BY createdAt DESC, id DESC
  `
  const result = await DB.prepare(sql).bind(pageId).all()
  if (result.error) {
    throw result.error
  }
  return result.results
}

async function getPageVersionById(DB: D1Database, versionId: number) {
  const sql = `SELECT * FROM page_versions WHERE id = ?`
  return await DB.prepare(sql).bind(versionId).first<{ id: number, pageId: number, title: string, pageDesc: string, contentUrl: string, screenshotId: string | null, createdAt: string }>()
}

async function queryAllPageIds(DB: D1Database, folderId: number) {
  const sql = `
    SELECT id FROM pages WHERE folderId = ? AND isDeleted = 0
  `
  const result = await DB.prepare(sql).bind(folderId).all()
  return result.results.map(r => r.id)
}

export {
  selectPageTotalCount,
  queryPage,
  queryPageByUrl,
  selectDeletedPageTotalCount,
  queryDeletedPage,
  deletePageById,
  restorePage,
  getPageById,
  insertPage,
  clearDeletedPage,
  hardDeletePages,
  purgeExpiredDeletedPages,
  queryRecentSavePage,
  selectAllPageCount,
  updatePage,
  queryAllPageIds,
  upsertPageFts,
  deletePageFtsByIds,
  queryPagesForReindex,
  queryPagesForRecheck,
  queryPagesForClassify,
  updatePageFolderId,
  updatePagesLinkStatus,
  getMaxLastChecked,
  searchPageIdsByKeyword,
  filterLivePageIds,
  getSearchPagesByIds,
  getFtsContentByIds,
  insertPageVersion,
  updatePageContent,
  updatePageDescription,
  queryPageVersions,
  getPageVersionById,
}

export type { SearchResultPageRow }
