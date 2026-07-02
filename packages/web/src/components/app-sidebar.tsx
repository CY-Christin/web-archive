import type { ReactNode } from 'react'
import { useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRequest } from 'ahooks'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Archive, LayoutDashboard, LogOut, Moon, PanelLeft, Pencil, Plus, SlidersHorizontal, Sun, Trash2, X } from 'lucide-react'
import { useTheme } from '@web-archive/shared/components/theme-provider'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@web-archive/shared/components/context-menu'
import { cn } from '@web-archive/shared/utils'
import type { Folder, Tag } from '@web-archive/shared/types'
import NewFolderDialog from './new-folder-dialog'
import EditFolderDialog from './edit-folder-dialog'
import EditTagDialog from './edit-tag-dialog'
import { deleteFolder, getAllFolder } from '~/data/folder'
import { deleteTag } from '~/data/tag'
import TagContext from '~/store/tag'
import emitter from '~/utils/emitter'
import { logOut } from '~/utils/router'
import { tagLabel } from '~/utils/tag'

// The backend is adding pageCount to GET /folders/all; render it only when present.
type SidebarFolder = Folder & { pageCount?: number }

interface AppSidebarProps {
  isMobile: boolean
  collapsed: boolean
  onToggleCollapse: () => void
  drawerOpen: boolean
  onCloseDrawer: () => void
}

interface NavItemProps {
  icon: ReactNode
  label: string
  active?: boolean
  showLabel: boolean
  danger?: boolean
  className?: string
  onClick: () => void
}

function NavItem({ icon, label, active = false, showLabel, danger = false, className, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={showLabel ? undefined : label}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-left text-sm font-semibold',
        active ? 'bg-accent-soft text-primary' : 'text-muted-foreground hover:bg-surface-2',
        danger && !active && 'hover:bg-danger-soft hover:text-danger',
        className,
      )}
    >
      <span className="shrink-0">{icon}</span>
      {showLabel && <span className="truncate">{label}</span>}
    </button>
  )
}

function GroupLabel({ children, action }: { children: ReactNode, action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 pb-1.5 pt-3.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">{children}</span>
      {action}
    </div>
  )
}

// Rename/delete context-menu (right-click / long-press) shared by folder rows
// and tag chips. Above the mobile drawer's z-[60] so it stays clickable there.
const contextMenuContentClass = 'z-[70] min-w-[160px] rounded-card border-border-strong p-1.5 shadow-lift'
const contextMenuItemClass = 'cursor-pointer gap-2 rounded-iconbtn px-2.5 py-2 text-[13px] font-semibold'

function AppSidebar({ isMobile, collapsed, onToggleCollapse, drawerOpen, onCloseDrawer }: AppSidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, setTheme } = useTheme()
  const { tagCache, refreshTagCache } = useContext(TagContext)

  const { data: folders, refresh: refreshFolders } = useRequest(getAllFolder)
  useEffect(() => {
    emitter.on('refreshSideBar', refreshFolders)
    return () => emitter.off('refreshSideBar', refreshFolders)
  }, [refreshFolders])

  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)
  const [editFolderDialogOpen, setEditFolderDialogOpen] = useState(false)
  const [editFolder, setEditFolder] = useState<Folder>()
  const [editTagDialogOpen, setEditTagDialogOpen] = useState(false)
  const [editTag, setEditTag] = useState<Tag>()

  const showLabels = isMobile ? true : !collapsed

  const handleNavigate = (to: string) => {
    navigate(to)
    if (isMobile)
      onCloseDrawer()
  }

  // Dialogs render at z-50; close the drawer (z-60) first so they aren't covered.
  const openDialogFromSidebar = (open: () => void) => {
    if (isMobile)
      onCloseDrawer()
    open()
  }

  const { run: runDeleteFolder } = useRequest(deleteFolder, {
    manual: true,
    onSuccess: (_, [id]) => {
      toast.success(t('folder-deleted-successfully'))
      emitter.emit('refreshSideBar')
      if (pathname === `/folder/${id}`)
        navigate('/archive')
    },
    onError: () => toast.error(t('failed-to-delete-folder')),
  })
  const handleDeleteFolder = (folder: Folder) => {
    if (window.confirm(t('are-you-sure-you-want-to-delete-this-folder')))
      runDeleteFolder(folder.id)
  }
  const handleEditFolder = (folder: Folder) => {
    setEditFolder(folder)
    openDialogFromSidebar(() => setEditFolderDialogOpen(true))
  }

  const { run: runDeleteTag } = useRequest(deleteTag, {
    manual: true,
    onSuccess: () => {
      toast.success(t('tag-deleted-successfully'))
      refreshTagCache()
    },
    onError: error => toast.error(error.message),
  })
  const handleDeleteTag = (tag: Tag) => {
    if (window.confirm(t('delete-tag-confirm')))
      runDeleteTag(tag.id)
  }
  const handleEditTag = (tag: Tag) => {
    setEditTag(tag)
    openDialogFromSidebar(() => setEditTagDialogOpen(true))
  }

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <>
      {isMobile && drawerOpen && (
        <div
          aria-hidden
          className="fixed inset-0 z-[55] bg-[rgba(9,11,15,0.45)] backdrop-blur-[2px]"
          onClick={onCloseDrawer}
        />
      )}

      {/* Mobile drawer: NO CSS transition on transform (transitions + frequent
          re-renders can leave the drawer stuck off-screen) — snap between states. */}
      <aside
        className={cn(
          'flex h-screen flex-col border-r border-border bg-sidebar',
          isMobile
            ? cn(
              'fixed left-0 top-0 z-[60] w-[272px]',
              drawerOpen ? 'translate-x-0 shadow-[0_24px_70px_-12px_rgba(0,0,0,0.45)]' : '-translate-x-full',
            )
            : cn(
              'sticky top-0 shrink-0 transition-[width] duration-200',
              collapsed ? 'w-[72px]' : 'w-64',
            ),
        )}
      >
        <NewFolderDialog
          afterSubmit={() => emitter.emit('refreshSideBar')}
          open={newFolderDialogOpen}
          setOpen={setNewFolderDialogOpen}
        />
        <EditFolderDialog
          afterSubmit={() => emitter.emit('refreshSideBar')}
          open={editFolderDialogOpen}
          setOpen={setEditFolderDialogOpen}
          editFolder={editFolder}
        />
        <EditTagDialog
          afterSubmit={() => { refreshTagCache() }}
          open={editTagDialogOpen}
          setOpen={setEditTagDialogOpen}
          editTag={editTag}
        />

        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-[11px] px-4 pb-3.5 pt-[18px]',
            !showLabels && 'flex-col gap-2 px-0',
          )}
        >
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-btn bg-primary text-white">
            <Archive size={19} strokeWidth={1.8} />
          </div>
          {showLabels && (
            <div className="min-w-0 leading-[1.15]">
              <div className="truncate text-[15px] font-extrabold tracking-[-0.01em] text-foreground">Web Archive</div>
              <div className="font-mono text-[11px] text-faint">self-hosted</div>
            </div>
          )}
          {isMobile
            ? (
              <button
                type="button"
                aria-label={t('close-menu')}
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-iconbtn bg-surface-2 text-muted-foreground"
                onClick={onCloseDrawer}
              >
                <X size={18} strokeWidth={2} />
              </button>
              )
            : (
              <button
                type="button"
                aria-label={t(collapsed ? 'expand-sidebar' : 'collapse-sidebar')}
                className={cn(
                  'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-iconbtn text-faint hover:bg-surface-2 hover:text-foreground',
                  showLabels && 'ml-auto',
                )}
                onClick={onToggleCollapse}
              >
                <PanelLeft size={18} strokeWidth={1.75} />
              </button>
              )}
        </div>

        {/* Scrollable middle: nav + folders + tags */}
        <div className="flex flex-1 flex-col gap-[3px] overflow-y-auto px-3 pb-3 pt-1.5">
          <NavItem
            icon={<LayoutDashboard size={19} strokeWidth={1.75} />}
            label={t('overview')}
            active={pathname === '/'}
            showLabel={showLabels}
            onClick={() => handleNavigate('/')}
          />
          <NavItem
            icon={<Archive size={19} strokeWidth={1.75} />}
            label={t('all-archives')}
            active={pathname === '/archive' || pathname.startsWith('/folder/')}
            showLabel={showLabels}
            onClick={() => handleNavigate('/archive')}
          />

          {showLabels && (
            <GroupLabel
              action={(
                <button
                  type="button"
                  aria-label={t('add-folder')}
                  title={t('add-folder')}
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-faint hover:bg-surface-2 hover:text-primary"
                  onClick={() => openDialogFromSidebar(() => setNewFolderDialogOpen(true))}
                >
                  <Plus size={15} strokeWidth={2} />
                </button>
              )}
            >
              {t('folders')}
            </GroupLabel>
          )}

          {(folders as SidebarFolder[] | undefined)?.map((folder, index) => {
            const active = pathname === `/folder/${folder.id}`
            return (
              <ContextMenu key={folder.id}>
                <ContextMenuTrigger asChild>
                  <button
                    type="button"
                    title={showLabels ? undefined : folder.name}
                    onClick={() => handleNavigate(`/folder/${folder.id}`)}
                    className={cn(
                      'flex w-full items-center gap-[11px] rounded-btn px-3 py-2 text-left text-[13.5px] font-semibold',
                      active ? 'bg-surface-2 text-foreground' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                      !showLabels && 'justify-center px-0',
                    )}
                  >
                    <span
                      aria-hidden
                      className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
                      style={{ background: `var(--chart-${(index % 5) + 1})` }}
                    />
                    {showLabels && <span className="min-w-0 flex-1 truncate">{folder.name}</span>}
                    {showLabels && folder.pageCount != null && (
                      <span className="font-mono text-[11px] text-faint">{folder.pageCount}</span>
                    )}
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent className={contextMenuContentClass}>
                  <ContextMenuItem className={contextMenuItemClass} onSelect={() => handleEditFolder(folder)}>
                    <Pencil size={14} strokeWidth={1.75} />
                    {t('edit')}
                  </ContextMenuItem>
                  <ContextMenuItem
                    className={cn(contextMenuItemClass, 'text-danger focus:bg-danger-soft focus:text-danger')}
                    onSelect={() => handleDeleteFolder(folder)}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                    {t('delete')}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}

          {showLabels && tagCache.length > 0 && (
            <>
              <GroupLabel>{t('tags')}</GroupLabel>
              <div className="flex flex-wrap gap-1.5 px-1.5">
                {tagCache.map(tag => (
                  <ContextMenu key={tag.id}>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        className="max-w-full truncate rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11.5px] text-muted-foreground hover:border-primary hover:text-primary"
                        onClick={() => handleNavigate(`/archive?tag=${tag.id}`)}
                      >
                        {tagLabel(tag)}
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className={contextMenuContentClass}>
                      <ContextMenuItem className={contextMenuItemClass} onSelect={() => handleEditTag(tag)}>
                        <Pencil size={14} strokeWidth={1.75} />
                        {t('edit')}
                      </ContextMenuItem>
                      <ContextMenuItem
                        className={cn(contextMenuItemClass, 'text-danger focus:bg-danger-soft focus:text-danger')}
                        onSelect={() => handleDeleteTag(tag)}
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                        {t('delete')}
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bottom block */}
        <div className="flex flex-col gap-[3px] border-t border-border px-3 py-2.5">
          <NavItem
            icon={<SlidersHorizontal size={19} strokeWidth={1.75} />}
            label={t('settings')}
            active={pathname === '/settings'}
            showLabel={showLabels}
            onClick={() => handleNavigate('/settings')}
          />
          <NavItem
            icon={<Trash2 size={19} strokeWidth={1.75} />}
            label={t('trash')}
            active={pathname === '/trash'}
            showLabel={showLabels}
            onClick={() => handleNavigate('/trash')}
          />
          <NavItem
            icon={isDark ? <Sun size={19} strokeWidth={1.75} /> : <Moon size={19} strokeWidth={1.75} />}
            label={t(isDark ? 'switch-to-light' : 'switch-to-dark')}
            showLabel={showLabels}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          />
          <NavItem
            icon={<LogOut size={19} strokeWidth={1.75} />}
            label={t('logout')}
            showLabel={showLabels}
            danger
            className="mt-0.5"
            onClick={() => logOut()}
          />
        </div>
      </aside>
    </>
  )
}

export default AppSidebar
