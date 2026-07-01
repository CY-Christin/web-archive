import { SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuSkeleton } from '@web-archive/shared/components/side-bar'
import { isNil } from '@web-archive/shared/utils'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { Folder as FolderType } from '@web-archive/shared/types'
import { useRequest } from 'ahooks'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import NewFolderDialog from './new-folder-dialog'
import EditFolderDialog from './edit-folder-dialog'
import Folder from './folder'
import { deleteFolder, getAllFolder } from '~/data/folder'
import emitter from '~/utils/emitter'
import { Link, useNavigate } from '~/router'

function getNextFolderId(folders: Array<FolderType>, index: number) {
  if (index === 0 && folders.length === 1) {
    return null
  }
  if (index === 0) {
    return folders[index + 1].id
  }
  return folders[index - 1].id
}

interface SidebarFolderCollapseProps {
  openedFolder: number | null
  setOpenedFolder: (id: number) => void
  className?: string
}

function SidebarFolderMenu({ openedFolder, setOpenedFolder, className }: SidebarFolderCollapseProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: folders, refresh, mutate: setFolders, loading: foldersLoading } = useRequest(getAllFolder)

  emitter.on('refreshSideBar', refresh)

  const handleDeleteFolder = async (folderId: number) => {
    if (isNil(folders) || !confirm(t('are-you-sure-you-want-to-delete-this-folder')))
      return

    try {
      await deleteFolder(folderId)
      const oldFolderIndex = folders.findIndex(folder => folder.id === folderId)
      const nextFolderId = getNextFolderId(folders, oldFolderIndex)
      setFolders(folders.filter((_, index) => index !== oldFolderIndex))
      if (nextFolderId !== null)
        setOpenedFolder(nextFolderId)
      else
        navigate('/')
      toast.success(t('folder-deleted-successfully'))
    }
    catch (error) {
      toast.error(t('failed-to-delete-folder'))
    }
  }

  const [editFolderDialogOpen, setEditFolderDialogOpen] = useState(false)
  const [editFolder, setEditFolder] = useState<FolderType>()
  const handleEditFolder = (folderId: number) => {
    setEditFolder(folders?.find(folder => folder.id === folderId))
    setEditFolderDialogOpen(true)
  }

  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)

  return (
    <SidebarGroup className={className}>
      <NewFolderDialog afterSubmit={refresh} open={newFolderDialogOpen} setOpen={setNewFolderDialogOpen} />
      <EditFolderDialog
        afterSubmit={refresh}
        open={editFolderDialogOpen}
        setOpen={setEditFolderDialogOpen}
        editFolder={editFolder}
      />

      <SidebarGroupLabel>{t('folders')}</SidebarGroupLabel>
      <SidebarGroupAction
        onClick={() => setNewFolderDialogOpen(true)}
        title={t('add-folder')}
        aria-label={t('add-folder')}
      >
        <Plus />
      </SidebarGroupAction>

      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {foldersLoading
            ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <SidebarMenuSkeleton key={index} showIcon />
                ))
              )
            : (
                folders?.map(folder => (
                  <SidebarMenuItem key={folder.id}>
                    <Link
                      to="/folder/:slug"
                      params={{ slug: folder.id.toString() }}
                      className="block outline-none"
                    >
                      <Folder
                        name={folder.name}
                        id={folder.id}
                        isOpen={openedFolder === folder.id}
                        onDelete={handleDeleteFolder}
                        onEdit={handleEditFolder}
                      />
                    </Link>
                  </SidebarMenuItem>
                ))
              )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export default SidebarFolderMenu
