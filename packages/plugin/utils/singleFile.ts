import { saveFile } from './file'

export interface LoadStage {
  PAGE_LOADING: 'page-loading'
  PAGE_LOADED: 'page-loaded'
  RESOURCES_INITIALIZING: 'resource-initializing'
  RESOURCES_INITIALIZED: 'resources-initialized'
  RESOURCE_LOADED: 'resource-loaded'
  PAGE_ENDED: 'page-ended'
  STAGE_STARTED: 'stage-started'
  STAGE_ENDED: 'stage-ended'
}

interface ProgressData extends LoadStage {
  type: LoadStage
  detail: {
    fram: boolean
    options: any
    pageURL: string
    step: number
  }
}

export interface SingleFileSetting {
  removeHiddenElements: boolean
  removeUnusedStyles: boolean
  removeUnusedFonts: boolean
  removeImports: boolean
  blockScripts: boolean
  blockAudios: boolean
  blockVideos: boolean
  // Web fonts (esp. full CJK woff2) can be several MB each and get inlined once
  // per @font-face weight, dwarfing the actual content — a V2EX thread inlined 73
  // fonts ≈ 164MB. Skip them; archived text falls back to system fonts, which is
  // fine for a reading archive.
  blockFonts?: boolean
  compressHTML: boolean
  removeAlternativeFonts: boolean
  removeAlternativeMedias: boolean
  removeAlternativeImages: boolean
  groupDuplicateImages: boolean
  loadDeferredImages?: boolean
  loadDeferredImagesMaxIdleTime?: number
  // Skip inlining any single resource larger than `maxResourceSize` MB. Keeps a
  // pathological page from ballooning past the extension messaging limit and
  // bloating R2 storage.
  maxResourceSizeEnabled?: boolean
  maxResourceSize?: number
  onprogress?: (data: ProgressData) => void
}

declare const extension: {
  getPageData: (
    options: SingleFileSetting
  ) => Promise<{
    content: string
    title: string
    filename: string
  }>
}

export async function getCurrentPageData(singleFileSetting?: SingleFileSetting) {
  const href = window.location.href
  const { content, title, filename } = await extension.getPageData({
    removeHiddenElements: true,
    removeUnusedStyles: true,
    removeUnusedFonts: true,
    removeImports: true,
    blockScripts: true,
    blockAudios: true,
    blockVideos: true,
    blockFonts: true,
    compressHTML: true,
    removeAlternativeFonts: true,
    removeAlternativeMedias: true,
    removeAlternativeImages: true,
    groupDuplicateImages: true,
    loadDeferredImages: true,
    loadDeferredImagesMaxIdleTime: 1500,
    maxResourceSizeEnabled: true,
    maxResourceSize: 10,
    ...(singleFileSetting ?? {}),
  })

  const descriptionList = document.getElementsByName('description')
  const pageDesc = descriptionList?.[0]?.getAttribute('content') ?? ''

  return {
    content,
    title,
    filename,
    href,
    pageDesc,
  }
}

export async function saveCurrentPage() {
  const { content, title } = await getCurrentPageData()
  saveFile(content, {
    filename: `${title}.html`,
  })
}
