import { useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, List, Menu, Plus, Search } from 'lucide-react'
import { cn } from '@web-archive/shared/utils'
import NewFolderDialog from './new-folder-dialog'
import AppContext from '~/store/app'
import emitter from '~/utils/emitter'

// Title/subtitle per screen, resolved by pathname. Page agents: extend here if
// a new layout route needs its own topbar title.
const TITLE_MAP: Array<{ match: (path: string) => boolean, titleKey: string, subKey: string }> = [
  { match: p => p === '/', titleKey: 'overview', subKey: 'overview-subtitle' },
  { match: p => p === '/archive' || p.startsWith('/folder/') || p.startsWith('/page/'), titleKey: 'all-archives', subKey: 'all-archives-subtitle' },
  { match: p => p.startsWith('/search'), titleKey: 'search-results', subKey: 'search-results-subtitle' },
  { match: p => p.startsWith('/trash'), titleKey: 'trash', subKey: 'trash-subtitle' },
  { match: p => p.startsWith('/settings'), titleKey: 'settings', subKey: 'settings-subtitle' },
]

interface AppTopbarProps {
  isMobile: boolean
  onOpenDrawer: () => void
}

function AppTopbar({ isMobile, onOpenDrawer }: AppTopbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { view, setView } = useContext(AppContext)

  const { titleKey, subKey } = TITLE_MAP.find(({ match }) => match(location.pathname))
    ?? { titleKey: 'overview', subKey: 'overview-subtitle' }

  const [keyword, setKeyword] = useState(() => new URLSearchParams(location.search).get('q') ?? '')
  // Follow ?q= while on /search so palette-initiated searches don't leave stale text.
  useEffect(() => {
    if (location.pathname.startsWith('/search'))
      setKeyword(new URLSearchParams(location.search).get('q') ?? '')
  }, [location.pathname, location.search])
  const handleSearchSubmit = () => {
    const q = keyword.trim()
    if (q.length > 0)
      navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-16 shrink-0 items-center border-b border-border bg-surface',
        isMobile ? 'gap-2.5 px-3.5' : 'gap-4 px-6',
      )}
    >
      <NewFolderDialog
        afterSubmit={() => emitter.emit('refreshSideBar')}
        open={newFolderDialogOpen}
        setOpen={setNewFolderDialogOpen}
      />

      {isMobile && (
        <button
          type="button"
          aria-label={t('open-menu')}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-btn border border-border-strong bg-surface-2 text-foreground"
          onClick={onOpenDrawer}
        >
          <Menu size={19} strokeWidth={1.9} />
        </button>
      )}

      {/* Title block */}
      <div className="min-w-0">
        <h1 className="truncate text-lg font-extrabold leading-[1.2] tracking-[-0.01em] text-foreground">
          {t(titleKey)}
        </h1>
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{t(subKey)}</p>
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex shrink-0 items-center gap-2.5">
        {isMobile
          ? (
            <button
              type="button"
              aria-label={t('open-command-palette')}
              className="flex h-10 w-10 items-center justify-center rounded-field border border-border-strong bg-surface-2 text-muted-foreground"
              onClick={() => emitter.emit('openCommandPalette')}
            >
              <Search size={18} strokeWidth={1.9} />
            </button>
            )
          : (
            <div className="flex h-10 min-w-[240px] items-center gap-2 rounded-field border border-border-strong bg-surface-2 px-3 focus-within:border-primary focus-within:shadow-focus-ring">
              <Search size={17} strokeWidth={1.9} className="shrink-0 text-faint" />
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    handleSearchSubmit()
                }}
                placeholder={t('topbar-search-placeholder')}
                className="w-full flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-faint"
              />
              <button
                type="button"
                aria-label={t('open-command-palette')}
                className="shrink-0 rounded-[6px] border border-border-strong px-[7px] py-[2px] font-mono text-[11px] text-faint hover:border-primary hover:text-primary"
                onClick={() => emitter.emit('openCommandPalette')}
              >
                ⌘K
              </button>
            </div>
            )}

        {!isMobile && (
          <div className="flex gap-[2px] rounded-field border border-border-strong bg-surface-2 p-[3px]">
            <button
              type="button"
              aria-label={t('grid-view')}
              title={t('grid-view')}
              className={cn(
                'flex h-[34px] w-[34px] items-center justify-center rounded-iconbtn',
                view === 'card' ? 'bg-surface text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'text-faint',
              )}
              onClick={() => setView('card')}
            >
              <LayoutGrid size={17} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label={t('list-view')}
              title={t('list-view')}
              className={cn(
                'flex h-[34px] w-[34px] items-center justify-center rounded-iconbtn',
                view === 'list' ? 'bg-surface text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'text-faint',
              )}
              onClick={() => setView('list')}
            >
              <List size={17} strokeWidth={1.8} />
            </button>
          </div>
        )}

        <button
          type="button"
          aria-label={t('new-folder')}
          className={cn(
            'flex h-10 items-center justify-center rounded-field bg-primary text-[13.5px] font-bold text-white hover:bg-primary-hover',
            isMobile ? 'w-10' : 'gap-2 px-[15px]',
          )}
          onClick={() => setNewFolderDialogOpen(true)}
        >
          <Plus size={16} strokeWidth={2.2} />
          {!isMobile && t('new-folder')}
        </button>
      </div>
    </header>
  )
}

export default AppTopbar
