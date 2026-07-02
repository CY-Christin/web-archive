import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pie, PieChart } from 'recharts'
import type { ChartConfig } from '@web-archive/shared/components/chart'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@web-archive/shared/components/chart'
import { Skeleton } from '@web-archive/shared/components/skeleton'
import type { Folder } from '@web-archive/shared/types'
import type { HomeChartData } from '~/data/data'
import { formatCount } from '~/components/dashboard/format'

// The sidebar colors folder dots by getAllFolder array index
// (`var(--chart-${(index % 5) + 1})`); reuse that mapping so donut slices and
// legend dots match the sidebar. page_chart_data is sorted by pageCount, so
// look folders up by id instead of trusting slice order.
function folderColor(folderId: string, folders: Folder[] | undefined, fallbackIndex: number) {
  const idx = folders?.findIndex(folder => String(folder.id) === String(folderId)) ?? -1
  const i = idx >= 0 ? idx : fallbackIndex
  return `var(--chart-${(i % 5) + 1})`
}

interface FolderDistributionCardProps {
  loading: boolean
  chartData?: HomeChartData
  folders?: Folder[]
}

function DonutHole({ total }: { total: number }) {
  const { t } = useTranslation()
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-surface">
      <span className="font-mono text-[26px] font-semibold tracking-[-0.02em] text-foreground">{formatCount(total)}</span>
      <span className="text-[11px] text-faint">{t('total-pages')}</span>
    </div>
  )
}

function FolderDistributionCard({ loading, chartData, folders }: FolderDistributionCardProps) {
  const { t } = useTranslation()

  const chart = useMemo(() => {
    const config: ChartConfig = {}
    const data: { folder: string, count: number, fill: string }[] = []
    chartData?.folders
      .filter(item => item.pageCount > 0)
      .forEach((item, index) => {
        const color = folderColor(item.id, folders, index)
        config[item.name] = { label: item.name, color }
        data.push({ folder: item.name, count: item.pageCount, fill: color })
      })
    return { config, data }
  }, [chartData, folders])

  return (
    <div className="flex flex-col rounded-card border border-border bg-surface p-[22px]">
      <h3 className="mb-5 text-[15px] font-bold text-foreground">{t('folder-distribution')}</h3>

      {loading || !chartData
        ? (
            <div className="flex items-center gap-8 max-desk:flex-col max-desk:items-start max-desk:gap-5">
              <Skeleton className="h-[168px] w-[168px] shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-[11px] max-desk:w-full">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-[19px] w-full" />
                ))}
              </div>
            </div>
          )
        : (
            <div className="flex items-center gap-8 max-desk:flex-col max-desk:items-start max-desk:gap-5">
              {chart.data.length > 0
                ? (
                    <div className="relative h-[168px] w-[168px] shrink-0">
                      {/* Hole overlays the (transparent-centered) svg; pointer-events-none
                      keeps ring hover + tooltip working near the hole's box corners */}
                      <DonutHole total={chartData.all} />
                      <ChartContainer config={chart.config} className="h-[168px] w-[168px]">
                        <PieChart>
                          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                          <Pie
                            data={chart.data}
                            dataKey="count"
                            nameKey="folder"
                            innerRadius={52}
                            outerRadius={84}
                            stroke="none"
                          />
                        </PieChart>
                      </ChartContainer>
                    </div>
                  )
                : (
                    <div className="relative flex h-[168px] w-[168px] shrink-0 items-center justify-center rounded-full bg-surface-2">
                      <DonutHole total={chartData.all} />
                    </div>
                  )}

              <div className="flex min-w-0 flex-1 flex-col gap-[11px]">
                {chart.data.map(item => (
                  <div key={item.folder} className="flex items-center gap-2.5">
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: item.fill }} />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-foreground">{item.folder}</span>
                    <span className="font-mono text-[12.5px] text-muted-foreground">{formatCount(item.count)}</span>
                  </div>
                ))}
                {chart.data.length === 0 && chartData.all === 0 && (
                  <div className="text-[13px] text-muted-foreground">{t('no-pages-yet')}</div>
                )}
              </div>
            </div>
          )}
    </div>
  )
}

export default FolderDistributionCard
