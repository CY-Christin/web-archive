import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@web-archive/shared/components/context-menu'
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from '@web-archive/shared/components/side-bar'
import type { Tag } from '@web-archive/shared/types'
import { cn } from '@web-archive/shared/utils'
import { useRequest } from 'ahooks'
import { Pencil, Trash } from 'lucide-react'
import { useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import EditTagDialog from './edit-tag-dialog'
import TagIcon from './tag-icon'
import { deleteTag } from '~/data/tag'
import TagContext from '~/store/tag'
import { queryAllPageIds } from '~/data/page'

interface SidebarTagMenuProps {
  selectedFolder: number | null
  selectedTag: number | null
  setSelectedTag: (tag: number | null) => void
}

interface TagChipProps {
  tag: Tag
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
  onEdit: () => void
}

function TagChip({ tag, isSelected, onClick, onDelete, onEdit }: TagChipProps) {
  const { t } = useTranslation()
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'inline-flex max-w-full select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            isSelected
              ? 'border-transparent bg-sidebar-accent font-medium text-sidebar-accent-foreground ring-1 ring-sidebar-ring'
              : 'border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent',
          )}
        >
          <TagIcon tag={tag} />
          <span className="truncate">{tag.name}</span>
          <span className="tabular-nums text-sidebar-foreground/50">{tag.pageIds.length}</span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 shadow-elevated">
        <ContextMenuItem
          className="flex cursor-pointer items-center space-x-2"
          onClick={onEdit}
        >
          <Pencil size={12} />
          <div>{t('edit')}</div>
        </ContextMenuItem>
        <ContextMenuItem
          className="flex cursor-pointer items-center space-x-2"
          onClick={onDelete}
        >
          <Trash size={12} />
          <div>{t('delete')}</div>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function SidebarTagMenu({ selectedTag, setSelectedTag, selectedFolder }: SidebarTagMenuProps) {
  const { t } = useTranslation()
  const { tagCache: tags, refreshTagCache } = useContext(TagContext)

  const handleClickTag = (tagId: number) => {
    if (selectedTag === tagId) {
      setSelectedTag(null)
    }
    else {
      setSelectedTag(tagId)
    }
  }

  const { run: runDelete } = useRequest(deleteTag, {
    manual: true,
    onSuccess() {
      refreshTagCache()
    },
    onError(error) {
      toast.error(error.message)
    },
  })

  const [editTagDialogOpen, setEditTagDialogOpen] = useState(false)
  const [editTag, setEditTag] = useState<Tag>()
  const handleEditTag = (tag: Tag) => {
    setEditTagDialogOpen(true)
    setEditTag(tag)
  }

  const [showTagList, setShowTagList] = useState(tags)
  useEffect(() => {
    if (!selectedFolder) {
      setShowTagList(tags)
      return
    }
    queryAllPageIds(selectedFolder).then((data) => {
      const newTags = tags.filter((tag) => {
        return tag.pageIds.some(pageId => data.includes(pageId))
      })
      setShowTagList(newTags)
    })
  }, [selectedFolder, tags])

  if (!showTagList || showTagList.length === 0)
    return null

  return (
    <SidebarGroup>
      <EditTagDialog editTag={editTag} afterSubmit={refreshTagCache} open={editTagDialogOpen} setOpen={setEditTagDialogOpen} />

      <SidebarGroupLabel>{t('tags')}</SidebarGroupLabel>
      <SidebarGroupContent>
        <div
          className="flex flex-wrap gap-1.5 px-2 py-1"
          onContextMenu={e => e.preventDefault()}
        >
          {showTagList.map(tag => (
            <TagChip
              key={tag.id}
              tag={tag}
              isSelected={selectedTag === tag.id}
              onClick={() => handleClickTag(tag.id)}
              onDelete={() => { runDelete(tag.id) }}
              onEdit={() => { handleEditTag(tag) }}
            />
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export default SidebarTagMenu
