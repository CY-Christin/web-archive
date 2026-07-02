import type { Tag } from '@web-archive/shared/types'

// AI enrichment stores an emoji in tag.icon; chips render it before the name.
export function tagLabel(tag: Pick<Tag, 'name' | 'icon'>) {
  return tag.icon ? `${tag.icon} ${tag.name}` : tag.name
}
