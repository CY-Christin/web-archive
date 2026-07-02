import { Hono } from 'hono'
import type { HonoTypeUserInformation } from '~/constants/binding'
import { getBucketKeyOwners, getHomeChartData } from '~/model/data'
import result from '~/utils/result'

const app = new Hono<HonoTypeUserInformation>()

app.get('/page_chart_data', async (c) => {
  const data = await getHomeChartData(c.env.DB)

  return c.json(result.success(data))
})

// Bucket usage split into HTML snapshots vs screenshots by key ownership.
// Keys owned by neither (the bucket may be shared with other projects) count
// only into the grand totals, so html + screenshot may be less than the total.
app.get('/r2_usage', async (c) => {
  const { contentUrls, screenshotIds } = await getBucketKeyOwners(c.env.DB)

  let count = 0
  let size = 0
  let htmlCount = 0
  let htmlSize = 0
  let screenshotCount = 0
  let screenshotSize = 0

  // list() returns at most 1000 objects per call; walk the cursor to cover the bucket.
  let cursor: string | undefined
  do {
    const res = await c.env.BUCKET.list({ cursor })
    for (const obj of res.objects) {
      count++
      size += obj.size
      if (contentUrls.has(obj.key)) {
        htmlCount++
        htmlSize += obj.size
      }
      else if (screenshotIds.has(obj.key)) {
        screenshotCount++
        screenshotSize += obj.size
      }
    }
    cursor = res.truncated ? res.cursor : undefined
  } while (cursor)

  return c.json(result.success({ count, size, htmlCount, htmlSize, screenshotCount, screenshotSize }))
})

export default app
