import { Button } from '@web-archive/shared/components/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@web-archive/shared/components/dialog'
import { Input } from '@web-archive/shared/components/input'
import { isNil } from '@web-archive/shared/utils'
import { useRequest } from 'ahooks'
import { useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { updateTag } from '~/data/tag'
import TagContext from '~/store/tag'

interface EditTagProps {
  afterSubmit: () => void
  open: boolean
  setOpen: (open: boolean) => void
  editTag?: {
    id: number
    name: string
    icon?: string | null
  }
}

const PRESET_ICONS = ['🔖', '📄', '⭐', '💡', '🔗', '📚', '🎨', '🧠', '⚙️', '🔥', '📌', '🌐', '💻', '🎬', '🛒', '✅']

function EditTagDialog({ afterSubmit, open, setOpen, editTag }: EditTagProps) {
  const { t } = useTranslation()
  const { tagCache } = useContext(TagContext)
  const [tagName, setTagName] = useState(editTag?.name ?? '')
  const [icon, setIcon] = useState(editTag?.icon ?? '')
  useEffect(() => {
    setTagName(editTag?.name ?? '')
    setIcon(editTag?.icon ?? '')
  }, [editTag])

  const { run } = useRequest(
    updateTag,
    {
      manual: true,
      onSuccess: () => {
        setOpen(false)
        toast.success(t('tag-updated-successfully'))
        afterSubmit()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    },
  )

  const handleSubmit = () => {
    if (tagName.length === 0) {
      toast.error(t('tag-name-is-required'))
      return
    }
    if (isNil(editTag?.id)) {
      toast.error(t('tag-id-is-required'))
      return
    }
    const nameChanged = tagName !== editTag?.name
    if (nameChanged && tagCache?.find(tag => tag.name === tagName)) {
      toast.error(t('tag-name-already-exists'))
      return
    }
    run({ id: editTag.id, name: tagName, icon })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="shadow-elevated">
        <DialogHeader>
          <DialogTitle>{t('edit-tag')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">{t('tag-icon')}</span>
              <div className="flex h-10 w-12 items-center justify-center rounded-md border border-input bg-card text-lg">
                {icon || <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">{t('tag-name')}</span>
              <Input
                value={tagName}
                onChange={e => setTagName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder={t('tag-name')}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-xs text-muted-foreground transition-colors hover:bg-accent"
              onClick={() => setIcon('')}
            >
              {t('clear')}
            </button>
            {PRESET_ICONS.map(emoji => (
              <button
                key={emoji}
                type="button"
                className={`flex h-8 w-8 items-center justify-center rounded-md border text-base transition-colors hover:bg-accent ${icon === emoji ? 'border-primary bg-accent' : 'border-border'}`}
                onClick={() => setIcon(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit}>{t('update')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditTagDialog
