import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRequest } from 'ahooks'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Loader2, RotateCcw, X } from 'lucide-react'
import type { LinkStatus, Tag } from '@web-archive/shared/types'
import { cn } from '@web-archive/shared/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@web-archive/shared/components/dropdown-menu'
import { LINK_STATUS_META } from './link-status'
import { getAllFolder } from '~/data/folder'
import emitter from '~/utils/emitter'
import { tagLabel } from '~/utils/tag'

const LINK_STATUS_OPTIONS: LinkStatus[] = ['live', 'dead', 'redirect']

// UTC 'YYYY-MM-DD HH:MM:SS' → local 'YYYY-MM-DD HH:mm'.
function formatLocalDateTime(value: string) {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime()))
    return value.slice(0, 16)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const chipClass = 'flex items-center gap-1.5 rounded-full border border-border bg-surface px-[13px] py-[5px] text-[12.5px] font-semibold text-muted-foreground hover:border-primary hover:text-primary data-[state=open]:border-primary data-[state=open]:text-primary'

function FilterMenuItem({ selected, onSelect, children }: {
  selected: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <DropdownMenuItem
      className={cn(
        'cursor-pointer rounded-iconbtn px-2.5 py-2 text-[13px] font-semibold',
        selected ? 'text-primary focus:text-primary' : 'text-foreground',
      )}
      onSelect={onSelect}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      {selected && <Check size={14} strokeWidth={2} className="ml-3 shrink-0" />}
    </DropdownMenuItem>
  )
}

interface ArchiveFilterBarProps {
  total?: number
  folderId?: number
  onFolderChange: (folderId?: number) => void
  sort: 'newest' | 'oldest'
  onSortChange: (sort: 'newest' | 'oldest') => void
  linkStatus?: LinkStatus
  onLinkStatusChange: (status?: LinkStatus) => void
  /** Active ?tag= filter, rendered as a removable chip. */
  activeTag?: Tag
  onClearTag: () => void
  /** UTC 'YYYY-MM-DD HH:MM:SS' from getLinkCheckStatus; null = never probed. */
  lastChecked: string | null
  checking: boolean
  onRecheck: () => void
}

function ArchiveFilterBar({
  total,
  folderId,
  onFolderChange,
  sort,
  onSortChange,
  linkStatus,
  onLinkStatusChange,
  activeTag,
  onClearTag,
  lastChecked,
  checking,
  onRecheck,
}: ArchiveFilterBarProps) {
  const { t } = useTranslation()

  const { data: folders, refresh: refreshFolders } = useRequest(getAllFolder)
  useEffect(() => {
    emitter.on('refreshSideBar', refreshFolders)
    return () => emitter.off('refreshSideBar', refreshFolders)
  }, [refreshFolders])

  const currentFolder = folders?.find(folder => folder.id === folderId)
  const menuClass = 'max-h-[320px] min-w-[190px] overflow-y-auto rounded-card border-border-strong p-1.5 shadow-lift'

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      {total != null && (
        <>
          <span className="font-mono text-[12.5px] text-muted-foreground">{t('n-pages', { count: total })}</span>
          <span aria-hidden style={{ color: 'var(--border-strong)' }}>·</span>
        </>
      )}

      {/* Folder filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={chipClass}>
            <span className="max-w-[180px] truncate">{currentFolder?.name ?? t('all-folders')}</span>
            <ChevronDown size={13} strokeWidth={2} className="shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={menuClass}>
          <FilterMenuItem selected={folderId == null} onSelect={() => onFolderChange(undefined)}>
            {t('all-folders')}
          </FilterMenuItem>
          {folders?.map((folder, index) => (
            <FilterMenuItem key={folder.id} selected={folderId === folder.id} onSelect={() => onFolderChange(folder.id)}>
              {/* Same color-cycling rule as the sidebar so folder dots match */}
              <span
                aria-hidden
                className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
                style={{ background: `var(--chart-${(index % 5) + 1})` }}
              />
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
              {folder.pageCount != null && (
                <span className="font-mono text-[11px] text-faint">{folder.pageCount}</span>
              )}
            </FilterMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={chipClass}>
            {t(sort === 'newest' ? 'sort-newest' : 'sort-oldest')}
            <ChevronDown size={13} strokeWidth={2} className="shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={menuClass}>
          <FilterMenuItem selected={sort === 'newest'} onSelect={() => onSortChange('newest')}>
            {t('sort-newest')}
          </FilterMenuItem>
          <FilterMenuItem selected={sort === 'oldest'} onSelect={() => onSortChange('oldest')}>
            {t('sort-oldest')}
          </FilterMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Link status filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={chipClass}>
            <span
              aria-hidden
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ background: linkStatus ? LINK_STATUS_META[linkStatus].dot : 'var(--success)' }}
            />
            {linkStatus ? t(LINK_STATUS_META[linkStatus].labelKey) : t('link-status')}
            <ChevronDown size={13} strokeWidth={2} className="shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={menuClass}>
          <FilterMenuItem selected={linkStatus == null} onSelect={() => onLinkStatusChange(undefined)}>
            {t('link-status-all')}
          </FilterMenuItem>
          {LINK_STATUS_OPTIONS.map(status => (
            <FilterMenuItem key={status} selected={linkStatus === status} onSelect={() => onLinkStatusChange(status)}>
              <span
                aria-hidden
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ background: LINK_STATUS_META[status].dot }}
              />
              {t(LINK_STATUS_META[status].labelKey)}
            </FilterMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active tag filter chip (from ?tag=, set by sidebar tag chips) */}
      {activeTag && (
        <button
          type="button"
          aria-label={t('clear-tag-filter')}
          title={t('clear-tag-filter')}
          className="flex max-w-[220px] items-center gap-1.5 rounded-full bg-accent-soft px-[13px] py-[5px] font-mono text-[11.5px] text-primary"
          onClick={onClearTag}
        >
          <span className="min-w-0 truncate">{tagLabel(activeTag)}</span>
          <X size={12} strokeWidth={2} className="shrink-0" />
        </button>
      )}

      {/* Right cluster: last checked + recheck */}
      <div className="ml-auto flex items-center gap-3">
        {lastChecked && (
          <span className="font-mono text-[11.5px] text-faint">
            {`${t('last-checked')} ${formatLocalDateTime(lastChecked)}`}
          </span>
        )}
        <button
          type="button"
          disabled={checking}
          className={cn(
            'flex shrink-0 items-center gap-[7px] rounded-btn border border-border-strong bg-surface px-[13px] py-[7px] text-[12.5px] font-semibold',
            checking ? 'cursor-default text-faint' : 'text-foreground hover:border-primary hover:text-primary',
          )}
          onClick={onRecheck}
        >
          {checking
            ? <Loader2 size={15} strokeWidth={2} className="animate-spin-fast" />
            : <RotateCcw size={15} strokeWidth={2} />}
          {t(checking ? 'rechecking' : 'recheck')}
        </button>
      </div>
    </div>
  )
}

export default ArchiveFilterBar
