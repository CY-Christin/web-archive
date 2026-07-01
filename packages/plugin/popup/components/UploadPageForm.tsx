import { Input } from '@web-archive/shared/components/input'
import { Label } from '@web-archive/shared/components/label'
import type { PageType } from 'popup/PopupPage'
import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { sendMessage } from 'webext-bridge/popup'
import { Textarea } from '@web-archive/shared/components/textarea'
import { Button } from '@web-archive/shared/components/button'
import { useRequest } from 'ahooks'
import { isNil } from '@web-archive/shared/utils'
import toast from 'react-hot-toast'
import { Switch } from '@web-archive/shared/components/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web-archive/shared/components/select'
import { useTranslation } from 'react-i18next'
import FolderSelectWithCache, { getLastChooseFolderId } from './FolderSelectWithCache'
import TagInputWithCache from './TagInputWithCache'
import { getSingleFileSetting } from '~/popup/utils/singleFile'
import { takeScreenshot } from '~/popup/utils/screenshot'
import { getCurrentTab } from '~/popup/utils/tab'
import LoadingPage from '~/popup/components/LoadingPage'

interface UploadPageFormProps {
  setActivePage: (page: PageType) => void
}

async function scrapePageData() {
  const tab = await getCurrentTab()

  if (!tab?.id) {
    return {
      title: '',
      pageDesc: '',
      href: '',
      screenshot: undefined,
    }
  }

  const [pageData, screenshot] = await Promise.all([
    sendMessage('get-basic-page-data', {}, `content-script@${tab.id}`),
    takeScreenshot(tab.windowId),
  ])

  return {
    title: pageData.title,
    pageDesc: pageData.pageDesc,
    href: pageData.href,
    screenshot,
  }
}

function UploadPageForm({ setActivePage }: UploadPageFormProps) {
  const [uploadPageData, setUploadPageData] = useState({
    title: '',
    pageDesc: '',
    href: '',
    folderId: getLastChooseFolderId(),
    screenshot: undefined as undefined | string,
    bindTags: [] as string[],
    isShowcased: false,
  })

  function handleChange(e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement> | ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target
    setUploadPageData(prevData => ({
      ...prevData,
      [name]: value,
    }))
  }

  function handleFolderSelect(newFolder: string | undefined) {
    setUploadPageData(prevData => ({
      ...prevData,
      folderId: newFolder,
    }))
  }

  function handleTagSelect(newTags: string[]) {
    setUploadPageData(prevData => ({
      ...prevData,
      bindTags: newTags,
    }))
  }

  // If this URL is already archived, let the user choose how a re-save behaves.
  const [existingPage, setExistingPage] = useState<{ id: number, title: string, createdAt: string } | null>(null)
  const [saveMode, setSaveMode] = useState<'overwrite' | 'version' | 'new'>('version')

  const { run: checkExisting } = useRequest(
    async (pageUrl: string) => {
      const { pages } = await sendMessage('query-by-url', { pageUrl })
      return pages
    },
    {
      manual: true,
      onSuccess: (pages) => {
        setExistingPage(pages && pages.length > 0 ? pages[0] : null)
      },
    },
  )

  const { loading: isInitPageData } = useRequest(
    scrapePageData,
    {
      onSuccess: (data) => {
        setUploadPageData({
          ...uploadPageData,
          ...data,
        })
        if (data.href)
          checkExisting(data.href)
      },
    },
  )

  function handleCancel() {
    setActivePage('home')
  }

  const { t } = useTranslation()
  async function handleSavePage() {
    // todo await folderlist to check folder extists?
    if (isNil(uploadPageData.folderId)) {
      toast.error(t('folder-required'))
      return
    }
    const tab = await getCurrentTab()
    if (isNil(tab.id)) {
      toast.error(t('get-current-tab-info-failed'))
      return
    }
    await sendMessage('add-save-page-task', {
      tabId: tab.id,
      singleFileSetting: getSingleFileSetting(),
      pageForm: {
        title: uploadPageData.title,
        pageDesc: uploadPageData.pageDesc,
        href: uploadPageData.href,
        folderId: uploadPageData.folderId,
        screenshot: uploadPageData.screenshot,
        bindTags: uploadPageData.bindTags,
        isShowcased: uploadPageData.isShowcased,
        saveMode: existingPage ? saveMode : 'new',
        targetPageId: existingPage?.id,
      },
    })
    toast.success(t('add-save-page-task-success'))
    setActivePage('home')
  }

  if (isInitPageData) {
    return (
      <LoadingPage
        loadingText={t('scraping-page-data')}
      />
    )
  }

  return (
    <div className="w-80 max-h-[600px] p-4 space-y-4 flex flex-col scrollbar-hide overflow-auto">
      <div className="flex flex-col space-y-2">
        <Label
          htmlFor="title"
        >
          {t('title')}
        </Label>
        <Input
          type="text"
          id="title"
          name="title"
          value={uploadPageData.title}
          onChange={handleChange}
        />
      </div>

      <div className="flex flex-col space-y-2">
        <Label
          htmlFor="pageDesc"
        >
          {t('page-desc')}
        </Label>
        <Textarea
          id="pageDesc"
          name="pageDesc"
          value={uploadPageData.pageDesc}
          rows={3}
          onChange={handleChange}
        >
        </Textarea>
      </div>

      <div className="flex flex-col space-y-2">
        <Label
          htmlFor="showcased"
        >
          Showcased
        </Label>
        <Switch
          checked={uploadPageData.isShowcased}
          onCheckedChange={value => setUploadPageData(prevData => ({
            ...prevData,
            isShowcased: value,
          }))}
        >
        </Switch>
      </div>

      <div className="flex flex-col space-y-2">
        <Label>{t('tag')}</Label>
        <TagInputWithCache
          title={uploadPageData.title}
          description={uploadPageData.pageDesc}
          onValueChange={handleTagSelect}
        >
        </TagInputWithCache>
      </div>

      <div className="flex flex-col space-y-2">
        <Label
          htmlFor="folderId"
        >
          {t('folder')}
        </Label>
        <FolderSelectWithCache
          value={uploadPageData.folderId}
          onValueChange={handleFolderSelect}
        >
        </FolderSelectWithCache>
      </div>

      {existingPage && (
        <div className="flex flex-col space-y-2 rounded-md border border-border bg-muted/50 p-3">
          <Label className="text-muted-foreground">
            {t('already-archived')}
          </Label>
          <Select value={saveMode} onValueChange={value => setSaveMode(value as 'overwrite' | 'version' | 'new')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="version">{t('save-mode-version')}</SelectItem>
              <SelectItem value="overwrite">{t('save-mode-overwrite')}</SelectItem>
              <SelectItem value="new">{t('save-mode-new')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-between">
        <Button
          onClick={handleCancel}
          variant="outline"
        >
          {t('cancel')}
        </Button>
        <Button
          disabled={isNil(uploadPageData.folderId)}
          onClick={handleSavePage}
        >
          {t('confirm')}
        </Button>
      </div>
    </div>
  )
}

export default UploadPageForm
