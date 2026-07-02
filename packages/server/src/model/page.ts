import { isNotNil } from '@web-archive/shared/utils'
import type { TagBindRecord } from './tag'
import { generateUpdateTagSql } from './tag'
import type { Page } from '~/sql/types'
import { removeBucketFile } from '~/utils/file'
import { FTS_MIN_KEYWORD_LEN, ftsMatchQuery } from '~/utils/htmlToText'

interface PageQueryFilters {
  folderId?: number
  keyword?: string
  tagId?: number
  // ISO date strings (inclusive) filtering on pages.createdAt.
  startAt?: string
  endAt?: string
}

// Build the shared FROM + WHERE for page listing/counting.
// Keyword search joins the FTS index (title + description + full page text):
//   - >= 3 chars  -> `pages_fts MATCH` (fast, relevance-ranked; trigram needs 3 chars)
//   - 1-2 chars   -> LIKE over the FTS-stored columns, so short CJK words (e.g. 续费,
//                    会员) still match page content, which trigram alone cannot do.
// The FTS table must be referenced by name (not an alias) in a MATCH clause.
// Returns whether MATCH was used so callers can order by relevance vs. recency.
function buildPageQuery(filters: PageQueryFilters, selectClause: string) {
  const { folderId, keyword, tagId, startAt, endAt } = filters
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

async function queryPage(DB: D1Database, options: PageQueryFilters & { pageNumber?: number, pageSize?: number }) {
  const { pageNumber, pageSize } = options
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
      p.isShowcased
  `
  const { sql: baseSql, bindParams, useFts } = buildPageQuery(options, selectClause)

  // FTS matches are ordered by relevance; plain listing stays newest-first.
  let sql = `${baseSql} ORDER BY ${useFts ? 'rank' : 'p.createdAt DESC'}`

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
      deletedAt
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

async function clearDeletedPage(DB: D1Database, BUCKET: R2Bucket) {
  const pageListSql = `
    SELECT * FROM pages WHERE isDeleted = 1
  `
  const deletePageResult = await DB.prepare(pageListSql).all<Page>()
  if (deletePageResult.error) {
    return false
  }
  const deleteBucketKeys = deletePageResult.results
    .map(page => [page.screenshotId, page.contentUrl])
    .flat()
    .filter(isNotNil)
  await removeBucketFile(BUCKET, deleteBucketKeys)

  // Drop FTS rows for the pages being permanently removed.
  await deletePageFtsByIds(DB, deletePageResult.results.map(page => page.id))

  const sql = `
    DELETE FROM pages WHERE isDeleted = 1
  `
  const result = await DB.prepare(sql).run()
  return result.success
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
  queryRecentSavePage,
  selectAllPageCount,
  updatePage,
  queryAllPageIds,
  upsertPageFts,
  deletePageFtsByIds,
  queryPagesForReindex,
  insertPageVersion,
  updatePageContent,
  updatePageDescription,
  queryPageVersions,
  getPageVersionById,
}
