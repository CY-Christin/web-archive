import { useContext, useEffect } from 'react'
import { useRequest } from 'ahooks'
import { useTranslation } from 'react-i18next'
import { Archive, ChevronRight, Database, Folder as FolderIcon, Hash } from 'lucide-react'
import { Skeleton } from '@web-archive/shared/components/skeleton'
import StatTile from '~/components/dashboard/stat-tile'
import FolderDistributionCard from '~/components/dashboard/folder-distribution-card'
import StorageCard from '~/components/dashboard/storage-card'
import { formatCount, formatSize } from '~/components/dashboard/format'
import PageCard from '~/components/page-card'
import { getPageChartData, getR2Usage } from '~/data/data'
import { getAllFolder } from '~/data/folder'
import { getRecentSavePage } from '~/data/page'
import TagContext from '~/store/tag'
import emitter from '~/utils/emitter'
import { Link } from '~/router'

const RECENT_PAGE_COUNT = 8

function Dashboard() {
  const { t } = useTranslation()
  const { tagCache, tagCacheLoading } = useContext(TagContext)

  const { data: chartData, loading: chartLoading } = useRequest(getPageChartData)
  const { data: r2Usage, loading: r2Loading } = useRequest(getR2Usage)
  const { data: folders, loading: foldersLoading, refresh: refreshFolders } = useRequest(getAllFolder)
  const { data: recentPages, loading: recentLoading } = useRequest(getRecentSavePage)

  // Folder create/rename/delete elsewhere in the shell (topbar/sidebar) emits
  // this; keep the Folders tile and distribution card in sync.
  useEffect(() => {
    emitter.on('refreshSideBar', refreshFolders)
    return () => emitter.off('refreshSideBar', refreshFolders)
  }, [refreshFolders])

  // AI-bound tags are written with an emoji icon, so a non-empty icon is the
  // "AI generated" heuristic.
  const aiTagCount = tagCache.filter(tag => !!tag.icon).length
  const foldersWithPages = folders?.filter(folder => (folder.pageCount ?? 0) > 0).length ?? 0
  const storage = r2Usage ? formatSize(r2Usage.size) : null
  const recent = recentPages?.slice(0, RECENT_PAGE_COUNT) ?? []

  return (
    <div className="mx-auto max-w-[1400px] animate-fade-up">
      {/* Stat tiles */}
      <div className="mb-5 grid grid-cols-2 gap-4 desk:grid-cols-4">
        <StatTile
          icon={<Archive size={17} strokeWidth={1.75} />}
          label={t('stat-total-archives')}
          loading={chartLoading}
          value={formatCount(chartData?.all ?? 0)}
          sub={t('stat-total-archives-sub')}
        />
        <StatTile
          icon={<FolderIcon size={17} strokeWidth={1.75} />}
          label={t('folders')}
          loading={foldersLoading}
          value={formatCount(folders?.length ?? 0)}
          sub={t('stat-folders-sub', { n: foldersWithPages })}
        />
        <StatTile
          icon={<Hash size={17} strokeWidth={1.75} />}
          label={t('tags')}
          loading={tagCacheLoading}
          value={formatCount(tagCache.length)}
          sub={aiTagCount > 0 ? t('stat-tags-ai-sub', { n: aiTagCount }) : t('stat-tags-sub-neutral')}
        />
        <StatTile
          icon={<Database size={17} strokeWidth={1.75} />}
          label={t('stat-storage')}
          loading={r2Loading}
          value={storage
            ? (
              <>
                {storage.value}
                <span className="text-base text-muted-foreground">
                  {` ${storage.unit}`}
                </span>
              </>
              )
            : '0'}
          sub={t('stat-storage-sub')}
        />
      </div>

      {/* Chart row */}
      <div className="mb-7 grid grid-cols-1 gap-4 desk:grid-cols-[1.3fr_1fr]">
        <FolderDistributionCard
          loading={chartLoading || foldersLoading}
          chartData={chartData}
          folders={folders}
        />
        <StorageCard loading={r2Loading} usage={r2Usage} totalPages={chartData?.all} />
      </div>

      {/* Recent archives */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-extrabold tracking-[-0.01em] text-foreground">{t('recent-archives')}</h3>
        <Link
          to="/archive"
          className="flex items-center gap-[5px] text-[13px] font-semibold text-primary hover:text-primary-hover"
        >
          {t('view-all')}
          <ChevronRight size={15} strokeWidth={2} />
        </Link>
      </div>

      {recentLoading
        ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[280px] rounded-card" />
            ))}
          </div>
          )
        : recent.length > 0
          ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-4">
              {recent.map(page => (
                <PageCard key={page.id} page={page} variant="dashboard" />
              ))}
            </div>
            )
          : (
            <div className="rounded-card border border-border bg-surface py-14 text-center">
              <div className="text-[15px] font-bold text-muted-foreground">{t('no-pages-yet')}</div>
            </div>
            )}
    </div>
  )
}

export default Dashboard
