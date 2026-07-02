import fetcher from '~/utils/fetcher'

interface HomeChartData {
  folders: {
    id: string
    name: string
    pageCount: number
  }[]
  all: number
}

async function getPageChartData(): Promise<HomeChartData> {
  return fetcher('/data/page_chart_data', {
    method: 'GET',
  })
}

// Sizes in bytes. html* covers page snapshots (incl. archived versions),
// screenshot* covers page screenshots; keys the server can't attribute (bucket
// shared with other projects) count only into count/size, so the split parts
// may sum to less than the totals.
interface R2UsageData {
  count: number
  size: number
  htmlCount: number
  htmlSize: number
  screenshotCount: number
  screenshotSize: number
}

async function getR2Usage(): Promise<R2UsageData> {
  return fetcher('/data/r2_usage', {
    method: 'GET',
  })
}

export type { HomeChartData, R2UsageData }

export {
  getPageChartData,
  getR2Usage,
}
