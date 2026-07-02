import { onMessage } from 'webext-bridge/content-script'
import Browser from 'webextension-polyfill'
import { getCurrentPageData } from '~/utils/singleFile'

// Scraped HTML (with images inlined as base64) can exceed the 64MiB per-message
// limit of extension messaging, which silently killed saves on heavy pages like
// V2EX threads. Stream the content back over a long-lived Port in sub-limit
// chunks instead of returning it as a single message payload.
const SCRAPE_PORT_NAME = 'scrape-page-stream'
const CHUNK_SIZE = 8 * 1024 * 1024 // chars; ~16MB serialized worst case, safely < 64MiB

function createModal() {
  const modal = document.createElement('div')
  modal.innerHTML = `
    <div>
      Scraping Page Data...
      <br />
      <span></span>
    </div>
  `
  Object.assign(modal.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999999,
  })
  // add this class to make singlefile ignore this element when save page
  modal.classList.add('single-file-ui-element')
  return modal
}

Browser.runtime.onConnect.addListener((port) => {
  if (port.name !== SCRAPE_PORT_NAME)
    return

  port.onMessage.addListener(async (message: any) => {
    if (message?.type !== 'start')
      return

    const modal = createModal()
    document.documentElement.appendChild(modal)

    try {
      const { content } = await getCurrentPageData({
        ...(message.singleFileSetting ?? {}),
        onprogress: () => {},
      })

      port.postMessage({ type: 'meta', length: content.length })
      for (let i = 0; i < content.length; i += CHUNK_SIZE)
        port.postMessage({ type: 'chunk', data: content.slice(i, i + CHUNK_SIZE) })
      port.postMessage({ type: 'done' })
    }
    catch (e: any) {
      port.postMessage({ type: 'error', message: typeof e === 'string' ? e : (e?.message ?? 'scrape failed') })
    }
    finally {
      modal.remove()
    }
  })
})

onMessage('get-basic-page-data', async () => {
  const descriptionList = document.getElementsByName('description')
  const description = descriptionList?.[0]?.getAttribute('content') ?? ''
  return {
    title: document.title,
    href: window.location.href,
    pageDesc: description,
  }
})
