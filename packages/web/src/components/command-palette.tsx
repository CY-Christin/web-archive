import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { useTranslation } from 'react-i18next'
import { Command } from 'cmdk'
import { Archive, LayoutDashboard, Moon, Search, SlidersHorizontal, Sun, Trash2 } from 'lucide-react'
import { useTheme } from '@web-archive/shared/components/theme-provider'
import { LinkStatusDot } from './link-status'
import { getRecentSavePage } from '~/data/page'
import emitter from '~/utils/emitter'

const ITEM_CLASS = 'flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[11px] py-2.5 text-left text-sm font-semibold text-foreground outline-none data-[selected=true]:bg-surface-2'

// Shared uppercase group-heading style; top padding differs between the first
// group (9px) and the later ones (14px), so it lives on each <Command.Group>.
const GROUP_HEADING_CLASS = '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.05em] [&_[cmdk-group-heading]]:text-faint'
const FIRST_GROUP_HEADING_CLASS = '[&_[cmdk-group-heading]]:pt-[9px]'
const LATER_GROUP_HEADING_CLASS = '[&_[cmdk-group-heading]]:pt-3.5'

function safeHost(pageUrl: string) {
  try {
    return new URL(pageUrl).host.replace(/^www\./, '')
  }
  catch {
    return pageUrl
  }
}

function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleOpen = () => setOpen(true)
    emitter.on('openCommandPalette', handleOpen)

    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      else if (e.key === 'Escape') {
        setOpen(prev => (prev ? false : prev))
      }
    }
    window.addEventListener('keydown', handleKeydown)

    return () => {
      emitter.off('openCommandPalette', handleOpen)
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [])

  const { data: recentPages, run: fetchRecent } = useRequest(getRecentSavePage, { manual: true })
  useEffect(() => {
    if (open)
      fetchRecent()
    else
      setQuery('')
  }, [open, fetchRecent])

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (!open)
    return null

  const closePalette = () => setOpen(false)

  const handleFullTextSearch = () => {
    const q = query.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
    closePalette()
  }

  const jumpItems = [
    { labelKey: 'overview', to: '/', Icon: LayoutDashboard },
    { labelKey: 'all-archives', to: '/archive', Icon: Archive },
    { labelKey: 'trash', to: '/trash', Icon: Trash2 },
  ] as const

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-[rgba(9,11,15,0.5)] pt-[11vh] backdrop-blur-[3px]"
      onClick={closePalette}
    >
      <div
        className="w-[580px] max-w-[92vw] animate-fade-up-fast overflow-hidden rounded-card border border-border-strong bg-surface shadow-[0_30px_80px_-24px_rgba(0,0,0,0.55)]"
        onClick={e => e.stopPropagation()}
      >
        <Command loop label={t('command-palette')}>
          <div className="flex items-center gap-[11px] border-b border-border px-[18px] py-4">
            <Search size={19} strokeWidth={1.9} className="shrink-0 text-faint" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={t('cmdk-placeholder')}
              className="w-full flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-faint"
            />
            <span className="shrink-0 rounded-[6px] border border-border-strong px-[7px] py-[2px] font-mono text-[11px] text-faint">esc</span>
          </div>

          <Command.List className={`max-h-[52vh] overflow-y-auto p-2 ${GROUP_HEADING_CLASS}`}>
            <Command.Group heading={t('cmdk-quick-actions')} className={FIRST_GROUP_HEADING_CLASS}>
              {/* forceMount: the full-text search action must survive any filter,
                  so Enter always has a "search what I typed" escape hatch. */}
              <Command.Item
                forceMount
                value={t('cmdk-full-text-search')}
                className={ITEM_CLASS}
                onSelect={handleFullTextSearch}
              >
                <Search size={17} strokeWidth={1.75} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{t('cmdk-full-text-search')}</span>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-faint">↵</span>
              </Command.Item>
              <Command.Item
                value={t('cmdk-toggle-theme')}
                className={ITEM_CLASS}
                onSelect={() => {
                  setTheme(isDark ? 'light' : 'dark')
                  closePalette()
                }}
              >
                {isDark
                  ? <Sun size={17} strokeWidth={1.75} className="shrink-0" />
                  : <Moon size={17} strokeWidth={1.75} className="shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{t('cmdk-toggle-theme')}</span>
              </Command.Item>
              <Command.Item
                value={t('cmdk-open-settings')}
                className={ITEM_CLASS}
                onSelect={() => {
                  navigate('/settings')
                  closePalette()
                }}
              >
                <SlidersHorizontal size={17} strokeWidth={1.75} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{t('cmdk-open-settings')}</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading={t('cmdk-jump-to')} className={LATER_GROUP_HEADING_CLASS}>
              {jumpItems.map(({ labelKey, to, Icon }) => (
                <Command.Item
                  key={to}
                  value={t(labelKey)}
                  className={ITEM_CLASS}
                  onSelect={() => {
                    navigate(to)
                    closePalette()
                  }}
                >
                  <Icon size={17} strokeWidth={1.75} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {recentPages && recentPages.length > 0 && (
              <Command.Group heading={t('cmdk-recent-archives')} className={LATER_GROUP_HEADING_CLASS}>
                {recentPages.slice(0, 4).map((page) => {
                  const host = safeHost(page.pageUrl)
                  return (
                    <Command.Item
                      key={page.id}
                      value={`${page.title} ${host} ${page.id}`}
                      className={ITEM_CLASS}
                      onSelect={() => {
                        navigate(`/page/${page.id}`)
                        closePalette()
                      }}
                    >
                      <LinkStatusDot status={page.linkStatus} size={7} />
                      <span className="min-w-0 flex-1 truncate">{page.title}</span>
                      <span className="shrink-0 font-mono text-[11px] text-faint">{host}</span>
                    </Command.Item>
                  )
                })}
              </Command.Group>
            )}
          </Command.List>

          <div className="flex items-center gap-4 border-t border-border bg-surface-2 px-4 py-2.5 font-mono text-[11px] text-faint">
            <span>
              ↑↓
              {' '}
              {t('cmdk-hint-navigate')}
            </span>
            <span>
              ↵
              {' '}
              {t('cmdk-hint-open')}
            </span>
            <span>
              esc
              {' '}
              {t('cmdk-hint-close')}
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}

export default CommandPalette
