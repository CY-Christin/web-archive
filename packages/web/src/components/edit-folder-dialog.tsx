import { Button } from '@web-archive/shared/components/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@web-archive/shared/components/dialog'
import { Input } from '@web-archive/shared/components/input'
import { isNil } from '@web-archive/shared/utils'
import { useRequest } from 'ahooks'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { updateFolder } from '~/data/folder'

interface EditFolderProps {
  afterSubmit: () => void
  open: boolean
  setOpen: (open: boolean) => void
  editFolder?: {
    id: number
    name: string
  }
}

function EditFolderDialog({ afterSubmit, open, setOpen, editFolder }: EditFolderProps) {
  const { t } = useTranslation()
  const [folderName, setFolderName] = useState(editFolder?.name ?? '')
  useEffect(() => {
    setFolderName(editFolder?.name ?? '')
  }, [editFolder])
  const { run } = useRequest(
    updateFolder,
    {
      manual: true,
      onSuccess: () => {
        setOpen(false)
        toast.success(t('folder-updated-successfully'))
        afterSubmit()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    },
  )
  const handleSubmit = () => {
    if (folderName.length === 0) {
      toast.error(t('folder-name-is-required'))
      return
    }
    if (folderName === editFolder?.name) {
      setOpen(false)
      toast.success(t('folder-updated-successfully'))
      return
    }
    if (isNil(editFolder?.id)) {
      toast.error(t('folder-id-is-required'))
      return
    }
    run(editFolder.id, folderName)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="shadow-elevated">
        <DialogHeader>
          <DialogTitle>{t('edit-folder')}</DialogTitle>
        </DialogHeader>
        <Input
          value={folderName}
          onChange={e => setFolderName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder={t('folder-name')}
        />
        <DialogFooter>
          <Button onClick={handleSubmit}>{t('update')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditFolderDialog
