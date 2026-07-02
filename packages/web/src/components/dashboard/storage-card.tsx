import { useTranslation } from 'react-i18next'
import { Skeleton } from '@web-archive/shared/components/skeleton'
import type { R2UsageData } from '~/data/data'
import { formatCount, formatSizeText } from '~/components/dashboard/format'

interface StorageCardProps {
  loading: boolean
  usage?: R2UsageData
  // page_chart_data `all`; undefined while it loads, footer hidden until known.
  totalPages?: number
}

function StorageCard({ loading, usage, totalPages }: StorageCardProps) {
  const { t } = useTranslation()

  // htmlSize + screenshotSize can be less than size (bucket may be shared with
  // other projects), so the bar shows the two attributed parts against each other.
  const htmlSize = usage?.htmlSize ?? 0
  const screenshotSize = usage?.screenshotSize ?? 0
  const attributed = htmlSize + screenshotSize
  const htmlPct = attributed > 0 ? (htmlSize / attributed) * 100 : 0

  return (
    <div className="flex flex-col rounded-card border border-border bg-surface p-[22px]">
      <h3 className="mb-1.5 text-[15px] font-bold text-foreground">{t('storage-usage-title')}</h3>
      <p className="mb-5 text-[12.5px] text-muted-foreground">{t('storage-usage-sub')}</p>

      {loading || !usage
        ? (
            <>
              <Skeleton className="h-9 w-40" />
              <Skeleton className="mt-3.5 h-3 w-full rounded-[8px]" />
              <Skeleton className="mt-4 h-[19px] w-56" />
            </>
          )
        : (
            <>
              <div className="mb-3.5 flex items-baseline gap-2">
                <span className="font-mono text-[28px] font-semibold tracking-[-0.02em] text-foreground">
                  {formatSizeText(usage.size)}
                </span>
                <span className="text-[13px] text-faint">
                  {t('storage-objects-count', { total: formatCount(usage.count) })}
                </span>
              </div>

              <div className="flex h-3 overflow-hidden rounded-[8px] bg-surface-2">
                {attributed > 0 && (
                  <>
                    <div className="bg-chart-1" style={{ width: `${htmlPct}%` }} />
                    <div className="flex-1 bg-chart-3" />
                  </>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-5">
                <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                  <span aria-hidden className="h-[9px] w-[9px] shrink-0 rounded-[3px] bg-chart-1" />
                  <span>
                    {t('storage-html-label')}
                    {' · '}
                    {formatSizeText(htmlSize)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                  <span aria-hidden className="h-[9px] w-[9px] shrink-0 rounded-[3px] bg-chart-3" />
                  <span>
                    {t('storage-screenshot-label')}
                    {' · '}
                    {formatSizeText(screenshotSize)}
                  </span>
                </div>
              </div>

              {totalPages != null && totalPages > 0 && (
                <div className="mt-auto pt-5 font-mono text-xs text-faint">
                  {t('storage-avg-per-page', { size: formatSizeText(usage.size / totalPages) })}
                </div>
              )}
            </>
          )}
    </div>
  )
}

export default StorageCard
