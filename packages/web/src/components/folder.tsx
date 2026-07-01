import { Folder as FolderIcon, FolderOpen as FolderOpenIcon, Pencil, Trash } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@web-archive/shared/components/context-menu'
import { cn } from '@web-archive/shared/utils'
import { useTranslation } from 'react-i18next'

interface FolderProps {
  id: number
  name: string
  isOpen: boolean
  onClick?: (id: number) => void
  onDelete?: (folderId: number) => void
  onEdit?: (folderId: number) => void
}

function Folder({ id, name, isOpen, onClick, onDelete, onEdit }: FolderProps) {
  const { t } = useTranslation()

  const rowActionClass = 'flex h-6 w-6 items-center justify-center rounded-md text-sidebar-foreground/70 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring'

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={() => onClick?.(id)}
          className={cn(
            'group/folder flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            isOpen
              ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
          )}
        >
          {isOpen ? <FolderOpenIcon className="h-4 w-4 shrink-0" /> : <FolderIcon className="h-4 w-4 shrink-0" />}
          <span className="flex-1 truncate">{name}</span>
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/folder:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              aria-label={t('edit')}
              className={rowActionClass}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onEdit?.(id)
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={t('delete')}
              className={rowActionClass}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDelete?.(id)
              }}
            >
              <Trash className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 shadow-elevated">
        <ContextMenuItem className="flex cursor-pointer items-center space-x-2" onClick={() => onEdit?.(id)}>
          <Pencil size={12} />
          <div>{t('edit')}</div>
        </ContextMenuItem>
        <ContextMenuItem className="flex cursor-pointer items-center space-x-2" onClick={() => onDelete?.(id)}>
          <Trash size={12} />
          <div>{t('delete')}</div>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default Folder
