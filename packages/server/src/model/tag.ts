import { isNil } from '@web-archive/shared/utils'
import type { Tag } from '~/sql/types'

async function selectAllTags(DB: D1Database) {
  const sql = `
    SELECT 
      *
    FROM tags
  `
  const sqlResult = await DB.prepare(sql).all<Tag>()
  if (sqlResult.error) {
    throw sqlResult.error
  }
  const tagList = sqlResult.results.map((tag) => {
    const pageIdDict = JSON.parse(tag.pageIdDict) as Record<string, number>
    return {
      ...tag,
      pageIds: Object.values(pageIdDict),
    }
  })
  return tagList
}

async function getTagById(DB: D1Database, id: number) {
  const sql = `
    SELECT 
      *
    FROM tags
    WHERE id = ?
  `
  const tag = await DB.prepare(sql).bind(id).first<Tag>()
  const pageIdDict = JSON.parse(tag.pageIdDict) as Record<string, number>
  return {
    ...tag,
    pageIds: Object.values(pageIdDict),
  }
}

async function insertTag(DB: D1Database, options: { name: string, color: string }) {
  const { name, color } = options
  const sql = `
    INSERT INTO tags (name, color) 
    VALUES (?, ?)
  `
  const sqlResult = await DB.prepare(sql).bind(name, color).run()
  return sqlResult.success
}

async function updateTag(DB: D1Database, options: { id: number, name?: string, color?: string, icon?: string | null }) {
  const { id, name, color, icon } = options
  if (isNil(id)) {
    throw new Error('Tag id is required')
  }
  if (isNil(name) && isNil(color) && icon === undefined) {
    throw new Error('At least one field is required')
  }
  let sql = `
    UPDATE tags
    SET
  `
  const bindParams: (number | string | null)[] = []
  if (name) {
    sql += `name = ?, `
    bindParams.push(name)
  }
  if (color) {
    sql += `color = ?, `
    bindParams.push(color)
  }
  // icon is intentionally settable to '' / null to clear it, so check for presence not truthiness.
  if (icon !== undefined) {
    sql += `icon = ?, `
    bindParams.push(icon || null)
  }
  sql = `${sql.slice(0, -2)} WHERE id = ?`
  bindParams.push(id)
  const sqlResult = await DB.prepare(sql).bind(...bindParams).run()
  return sqlResult.success
}

async function deleteTagById(DB: D1Database, id: number) {
  const sql = `
    DELETE FROM tags
    WHERE id = ?
  `
  const sqlResult = await DB.prepare(sql).bind(id).run()
  return sqlResult.success
}

interface TagBindRecord {
  tagName: string
  pageIds: Array<number>
}

function generateUpdateTagSql(
  DB: D1Database,
  bindList: Array<TagBindRecord>,
  unbindList: Array<TagBindRecord>,
) {
  const updateStmt = DB.prepare(`
    INSERT INTO tags (name, pageIdDict) VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET pageIdDict = json_patch(pageIdDict, ?) WHERE name = ?
    `)
  const bindCommands = bindList.map(({ tagName, pageIds }) => {
    const mergePageJson = pageIdsToBindDictString(pageIds)
    return updateStmt.bind(tagName, mergePageJson, mergePageJson, tagName)
  })

  const unbindCommands = unbindList.map(({ tagName, pageIds }) => {
    const mergePageJson = pageIdsToUnbindDictString(pageIds)
    return updateStmt.bind(tagName, mergePageJson, mergePageJson, tagName)
  })

  return bindCommands.concat(unbindCommands)
}

async function updateBindPageByTagName(
  DB: D1Database,
  bindList: Array<TagBindRecord>,
  unbindList: Array<TagBindRecord>,
) {
  const commands = generateUpdateTagSql(DB, bindList, unbindList)
  if (commands.length === 0) {
    return true
  }

  const updateResult = await DB.batch(commands)
  return updateResult.every(result => result.success)
}

async function getAllTagNames(DB: D1Database): Promise<string[]> {
  const res = await DB.prepare(`SELECT name FROM tags`).all<{ name: string }>()
  return res.results.map(r => r.name)
}

// Bind a page to AI-generated tags, creating missing tags with their emoji icon.
// Existing tags keep their current icon (COALESCE), so this never clobbers icons
// a user already set.
async function bindPageTagsWithIcon(DB: D1Database, pageId: number, tags: Array<{ name: string, icon: string }>) {
  const clean = tags.filter(t => t.name?.trim())
  if (clean.length === 0)
    return true

  const stmt = DB.prepare(`
    INSERT INTO tags (name, pageIdDict, icon) VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        pageIdDict = json_patch(pageIdDict, excluded.pageIdDict),
        icon = COALESCE(NULLIF(icon, ''), excluded.icon)
  `)
  const bindJson = JSON.stringify({ [String(pageId)]: pageId })
  const commands = clean.map(t => stmt.bind(t.name.trim(), bindJson, t.icon?.trim() || null))
  const res = await DB.batch(commands)
  return res.every(r => r.success)
}

function pageIdsToBindDictString(pageIds: Array<number>) {
  const dict = pageIds.reduce((acc, cur) => {
    acc[cur.toString()] = cur
    return acc
  }, {})
  return JSON.stringify(dict)
}

function pageIdsToUnbindDictString(pageIds: Array<number>) {
  const dict = pageIds.reduce((acc, cur) => {
    acc[cur.toString()] = null
    return acc
  }, {})
  return JSON.stringify(dict)
}

export {
  selectAllTags,
  insertTag,
  getTagById,
  updateTag,
  deleteTagById,
  updateBindPageByTagName,
  generateUpdateTagSql,
  getAllTagNames,
  bindPageTagsWithIcon,
  TagBindRecord,
}
