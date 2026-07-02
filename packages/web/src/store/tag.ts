import type { Tag } from '@web-archive/shared/types'
import { createContext } from 'react'

const TagContext = createContext<{
  tagCache: Tag[]
  /** True until the first getAllTag response lands (tagCache is [] meanwhile). */
  tagCacheLoading: boolean
  refreshTagCache: () => Promise<Tag[]>
}>({
      tagCache: [],
      tagCacheLoading: false,
      refreshTagCache: async () => [],
    })

export default TagContext
