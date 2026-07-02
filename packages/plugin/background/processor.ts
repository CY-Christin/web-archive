import Browser from 'webextension-polyfill'
import { request } from './background'
import { keepAlive } from './keepAlive'
import type { SingleFileSetting } from '~/utils/singleFile'
import { base64ToBlob } from '~/utils/file'

export interface SeriableSingleFileTask {
  uuid: string
  status: 'init' | 'scraping' | 'uploading' | 'done' | 'failed'
  progress: number
  href: string
  tabId: number
  title: string
  pageDesc: string
  folderId: string
  bindTags: string[]
  isShowcased: boolean
  startTimeStamp: number
  endTimeStamp?: number
  errorMessage?: string
}

async function markUnfinishedTasksAsFailed() {
  const tasks = await getTaskList()
  tasks.forEach((task: SeriableSingleFileTask) => {
    if (task.status !== 'done' && task.status !== 'failed') {
      task.status = 'failed'
      task.endTimeStamp = Date.now()
      task.errorMessage = 'Failed because of service worker restart'
    }
  })
  await saveTaskList(tasks)
}

let isInit = false
Browser.runtime.onConnect.addListener(() => {
  console.log('connect', isInit)
  if (!isInit) {
    isInit = true
    markUnfinishedTasksAsFailed()
  }
})

async function getTaskList(): Promise<SeriableSingleFileTask[]> {
  const { tasks } = await Browser.storage.local.get('tasks')
  return tasks || []
}

async function saveTaskList(tasks: SeriableSingleFileTask[]) {
  await Browser.storage.local.set({ tasks })
}

async function saveTask(task: SeriableSingleFileTask) {
  const tasks = await getTaskList()

  const index = tasks.findIndex(t => t.uuid === task.uuid)
  if (index === -1) {
    tasks.push(task)
  }
  else {
    tasks[index] = task
  }
  await Browser.storage.local.set({ tasks })
}

async function clearFinishedTaskList() {
  const tasks = await getTaskList()

  const newTasks = tasks.filter(task => task.status !== 'done' && task.status !== 'failed')
  await saveTaskList(newTasks)
}

type CreateTaskOptions = {
  tabId: number
  pageForm: {
    href: string
    title: string
    pageDesc: string
    folderId: string
    screenshot?: string
    bindTags: string[]
    isShowcased: boolean
    saveMode?: 'new' | 'overwrite' | 'version'
    targetPageId?: number
  }
  singleFileSetting: SingleFileSetting
}

const SCRAPE_PORT_NAME = 'scrape-page-stream'

// Pull the scraped HTML from the content script over a long-lived Port, chunked
// to stay under the 64MiB per-message messaging limit (see contentScripts/content.ts).
function streamScrapeContent(singleFileSetting: SingleFileSetting, tabId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const port = Browser.tabs.connect(tabId, { name: SCRAPE_PORT_NAME })
    const chunks: string[] = []
    let settled = false

    const finish = (fn: () => void) => {
      if (settled)
        return
      settled = true
      try {
        port.disconnect()
      }
      catch {}
      fn()
    }

    port.onMessage.addListener((message: any) => {
      if (message?.type === 'chunk')
        chunks.push(message.data)
      else if (message?.type === 'done')
        finish(() => resolve(chunks.join('')))
      else if (message?.type === 'error')
        finish(() => reject(new Error(message.message ?? 'scrape failed')))
    })

    port.onDisconnect.addListener(() => {
      finish(() => reject(new Error(Browser.runtime.lastError?.message ?? 'scrape port disconnected before completion')))
    })

    port.postMessage({ type: 'start', singleFileSetting })
  })
}

export interface CaptureDisableRule {
  // Regex source matched (case-insensitive) against the tab URL.
  url: string
  // Extension IDs to disable while capturing a matching page.
  extIds: string[]
}

const CAPTURE_RULES_KEY = 'captureDisableRules'

// Seeded default: V2EX Polish repaints v2ex.com via injected, non-serializable
// CSS, which corrupts the captured HTML. Disable it while saving v2ex pages.
const DEFAULT_CAPTURE_DISABLE_RULES: CaptureDisableRule[] = [
  { url: 'v2ex\\.com', extIds: ['onnepejgdiojhiflfoemillegpgpabdm'] },
]

export async function getCaptureDisableRules(): Promise<CaptureDisableRule[]> {
  const { [CAPTURE_RULES_KEY]: rules } = await Browser.storage.local.get(CAPTURE_RULES_KEY)
  // Only fall back to the seed when unset; an explicit empty array means "none".
  return Array.isArray(rules) ? rules : DEFAULT_CAPTURE_DISABLE_RULES
}

function reloadTabAndWait(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      Browser.tabs.onUpdated.removeListener(listener)
      reject(new Error('Timed out waiting for the page to reload'))
    }, 60_000)
    function listener(updatedTabId: number, changeInfo: { status?: string }) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timer)
        Browser.tabs.onUpdated.removeListener(listener)
        // Give the content script's dynamic import time to register its Port
        // listener before we connect (avoids "Receiving end does not exist").
        setTimeout(resolve, 800)
      }
    }
    Browser.tabs.onUpdated.addListener(listener)
    Browser.tabs.reload(tabId).catch((e) => {
      clearTimeout(timer)
      Browser.tabs.onUpdated.removeListener(listener)
      reject(e)
    })
  })
}

// Temporarily disable extensions (e.g. a site "beautifier") whose injected CSS
// corrupts the capture, reload the tab so their effects are gone, and return a
// function that re-enables them afterwards.
async function disableExtensionsForCapture(tabId: number, url: string): Promise<() => Promise<void>> {
  const rules = await getCaptureDisableRules()
  const extIds = new Set<string>()
  for (const rule of rules) {
    if (!rule.url || !rule.extIds?.length)
      continue
    let matched = false
    try {
      matched = new RegExp(rule.url, 'i').test(url)
    }
    catch {
      matched = url.includes(rule.url)
    }
    if (matched)
      rule.extIds.forEach(id => extIds.add(id))
  }

  if (extIds.size === 0)
    return async () => {}

  const disabled: string[] = []
  for (const id of extIds) {
    try {
      await Browser.management.setEnabled(id, false)
      disabled.push(id)
    }
    catch (e) {
      console.warn('web-archive: failed to disable extension', id, e)
    }
  }

  if (disabled.length > 0)
    await reloadTabAndWait(tabId)

  return async () => {
    for (const id of disabled) {
      try {
        await Browser.management.setEnabled(id, true)
      }
      catch (e) {
        console.warn('web-archive: failed to re-enable extension', id, e)
      }
    }
  }
}

async function scrapePageData(singleFileSetting: SingleFileSetting, tabId: number) {
  await Browser.scripting.executeScript({
    target: { tabId },
    files: ['/lib/single-file.js', '/lib/single-file-extension-core.js'],
  })

  // The content script may not have finished registering its Port listener yet
  // (especially right after a reload). Retry a connection-level failure a few
  // times before giving up.
  const maxAttempts = 5
  for (let attempt = 1; ; attempt++) {
    try {
      return await streamScrapeContent(singleFileSetting, tabId)
    }
    catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const isConnectionError = /Receiving end does not exist|Could not establish connection|disconnected before completion/i.test(message)
      if (attempt >= maxAttempts || !isConnectionError)
        throw e
      await new Promise(resolve => setTimeout(resolve, 600))
    }
  }
}

async function uploadPageData(pageForm: CreateTaskOptions['pageForm'] & { content: string }) {
  const { href, title, pageDesc, folderId, screenshot, content, isShowcased, saveMode, targetPageId } = pageForm

  const form = new FormData()
  form.append('title', title)
  form.append('pageUrl', href)
  form.append('pageDesc', pageDesc)
  form.append('folderId', folderId)
  form.append('bindTags', JSON.stringify(pageForm.bindTags))
  form.append('pageFile', new Blob([content], { type: 'text/html' }))
  form.append('isShowcased', isShowcased ? '1' : '0')
  // When re-saving an already-archived URL, tell the server how to handle it.
  if (saveMode && saveMode !== 'new' && targetPageId != null) {
    form.append('saveMode', saveMode)
    form.append('targetPageId', String(targetPageId))
  }
  if (screenshot) {
    form.append('screenshot', base64ToBlob(screenshot, 'image/webp'))
  }
  const timeout = 5 * 60 * 1000
  keepAlive(timeout)
  await request('/pages/upload_new_page', {
    method: 'POST',
    body: form,
    timeout,
  })
}

async function createAndRunTask(options: CreateTaskOptions) {
  const { singleFileSetting, tabId, pageForm } = options
  const { href, title, pageDesc, folderId, screenshot, bindTags, isShowcased } = pageForm

  const uuid = crypto.randomUUID()
  const task: SeriableSingleFileTask = {
    uuid,
    status: 'init',
    progress: 0,
    tabId,
    href,
    title,
    pageDesc,
    folderId,
    bindTags,
    isShowcased,
    startTimeStamp: Date.now(),
  }

  // todo wait refactor, add progress
  async function run() {
    task.status = 'scraping'
    await saveTask(task)

    // Disable configured extensions (reloads the tab), capture, then always
    // re-enable them — even if the capture throws.
    const restoreExtensions = await disableExtensionsForCapture(tabId, href)
    let content: string
    try {
      content = await scrapePageData(singleFileSetting, tabId)
    }
    finally {
      await restoreExtensions()
    }

    task.status = 'uploading'
    await saveTask(task)

    await uploadPageData({ ...pageForm, content })
    task.status = 'done'
    task.endTimeStamp = Date.now()
    await saveTask(task)
  }

  await saveTask(task)
  try {
    await run()
  }
  catch (e: any) {
    task.status = 'failed'
    task.endTimeStamp = Date.now()
    console.error('task failed', e, task)
    task.errorMessage = typeof e === 'string' ? e : e.message
    await saveTask(task)
  }
}

export {
  createAndRunTask,
  getTaskList,
  clearFinishedTaskList,
}
