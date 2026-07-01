import { Button } from '@web-archive/shared/components/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web-archive/shared/components/select'
import { useRequest } from 'ahooks'
import { ArrowLeft, Trash } from 'lucide-react'
import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import IframePageContent from '~/components/iframe-page-content'
import LoadingWrapper from '~/components/loading-wrapper'
import ReadabilityPageContent from '~/components/readability-page-content'
import { deletePage, getPageDetail, getPageVersions } from '~/data/page'
import { useObjectURL } from '~/hooks/useObjectUrl'
import { useNavigate, useParams } from '~/router'
import AppContext from '~/store/app'

async function fetchHtmlWithToken(url: string) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'text/html',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  })
  return await res.text()
}

async function getPageContent(pageId: string | undefined) {
  if (!pageId)
    return ''
  return fetchHtmlWithToken(`/api/pages/content?pageId=${pageId}`)
}

async function getVersionContent(versionId: number) {
  return fetchHtmlWithToken(`/api/pages/version_content?versionId=${versionId}`)
}

// 'latest' shows the page's current content; a number shows an archived snapshot.
const LATEST = 'latest'

function ArchivePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { slug } = useParams('/page/:slug')

  useEffect(() => {
    if (!slug) {
      navigate('/')
    }
  })

  const { data: pageDetail } = useRequest(
    getPageDetail,
    {
      onSuccess: (pageDetail) => {
        if (!pageDetail) {
          navigate('/error/:slug', { params: { slug: '404' } })
        }
      },
      defaultParams: [slug],
    },
  )

  const goBack = () => {
    if (pageDetail)
      navigate('/folder/:slug', { params: { slug: String(pageDetail?.folderId) } })
    else
      window.history.back()
  }

  // Historical snapshots (empty when the page has only ever been saved once).
  const { data: versions } = useRequest(
    () => getPageVersions(Number(slug)),
    { ready: !!slug },
  )
  const [selectedVersion, setSelectedVersion] = useState<string>(LATEST)

  const { objectURL: pageContentUrl, setObject } = useObjectURL(null)
  const { data: pageHtml, loading: pageLoading } = useRequest(
    async () => {
      if (selectedVersion === LATEST)
        return await getPageContent(slug)
      return await getVersionContent(Number(selectedVersion))
    },
    {
      onSuccess: (pageHtml) => {
        setObject(pageHtml)
      },
      refreshDeps: [selectedVersion],
    },
  )

  const { runAsync: runDeletePage } = useRequest(
    deletePage,
    {
      manual: true,
    },
  )
  const handleDeletePage = async () => {
    if (!window.confirm(t('delete-this-page-confirm')))
      return
    if (!pageDetail)
      return
    await runDeletePage(pageDetail)
    goBack()
  }

  const { readMode, setReadMode } = useContext(AppContext)

  return (
    <main className="flex h-screen w-screen flex-col bg-background lg:w-full">
      <nav className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-display text-base font-semibold text-foreground">
          {pageDetail?.title}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          {versions && versions.length > 0 && (
            <Select value={selectedVersion} onValueChange={setSelectedVersion}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LATEST}>{t('latest-version')}</SelectItem>
                {versions.map(version => (
                  <SelectItem key={version.id} value={String(version.id)}>
                    {version.createdAt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <a
            href={pageContentUrl ?? ''}
            download={`${pageDetail?.title ?? 'Download'}.html`}
          >
            <Button variant="default" size="sm">
              {t('download')}
            </Button>
          </a>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setReadMode(!readMode)}
          >
            {readMode ? t('open-iframe-mode') : t('open-read-mode')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDeletePage}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </nav>
      <div className="min-h-0 w-full flex-1 p-4">
        <div className="h-full overflow-auto rounded-lg border border-border bg-card">
          <LoadingWrapper loading={pageLoading}>
            {readMode
              ? <ReadabilityPageContent pageHtml={pageHtml || ''} />
              : <IframePageContent pageContentUrl={pageContentUrl || ''} />}
          </LoadingWrapper>
        </div>
      </div>
    </main>
  )
}

export default ArchivePage
