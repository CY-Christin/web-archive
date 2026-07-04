import type { Tag } from '@web-archive/shared/types'
import fetcher from '~/utils/fetcher'

function getAllTag(): Promise<Tag[]> {
  return fetcher<Tag[]>('/tags/all', {
    method: 'GET',
  })
}

function deleteTag(tagId: number): Promise<void> {
  return fetcher<void>(`/tags/delete`, {
    method: 'DELETE',
    query: { id: tagId.toString() },
  })
}

function updateTag(body: { id: number, name?: string, color?: string, icon?: string | null }): Promise<void> {
  return fetcher<void>(`/tags/update`, {
    method: 'POST',
    body,
  })
}

function generateTag(body: {
  title: string
  pageDesc: string
  model: string
  preferredTags: string[]
  tagLanguage: string
  type?: 'cloudflare' | 'openai' | 'cloudflare-gateway'
  baseUrl?: string
  apiKey?: string
  gatewayToken?: string
}): Promise<string[]> {
  return fetcher<string[]>('/tags/generate_tag', {
    method: 'POST',
    body,
  })
}

function testAIConnection(body: {
  model: string
  type?: 'cloudflare' | 'openai' | 'cloudflare-gateway'
  baseUrl?: string
  apiKey?: string
  gatewayToken?: string
}): Promise<null> {
  return fetcher<null>('/tags/test_connection', {
    method: 'POST',
    body,
  })
}

export {
  getAllTag,
  deleteTag,
  updateTag,
  generateTag,
  testAIConnection,
}
