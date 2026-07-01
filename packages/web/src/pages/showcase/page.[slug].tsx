import { Button } from '@web-archive/shared/components/button'
import { useKeyPress, useRequest } from 'ahooks'
import { ArrowLeft, ArrowRight, House } from 'lucide-react'
import { useEffect } from 'react'
import PoweredBy from '~/components/powerd-by'
import { getNextShowcasePageId } from '~/data/showcase'
import { useNavigate, useParams } from '~/router'

async function getPageContent(pageId: string | undefined) {
  if (!pageId)
    return ''
  const url = `/api/showcase/content?pageId=${pageId}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'text/html',
    },
  })
  return await res.text()
}

function ShowcasePage() {
  const navigate = useNavigate()
  const { slug } = useParams('/showcase/page/:slug')
  useEffect(() => {
    if (!slug) {
      navigate('/showcase/folder')
    }
  })

  const { run: goNext, loading: getNextLoading } = useRequest(
    getNextShowcasePageId,
    {
      manual: true,
      onSuccess(nextId) {
        navigate('/showcase/page/:slug', {
          params: {
            slug: String(nextId),
          },
        })
      },
    },
  )

  const goBack = () => {
    window.history.back()
  }
  const goHome = () => {
    navigate('/showcase/folder')
  }

  useKeyPress('leftarrow', () => {
    goBack()
  })
  useKeyPress('rightarrow', () => {
    goNext(Number(slug))
  })

  const { slug: pageId } = useParams('/showcase/page/:slug')
  const { data: pageContentUrl, loading: pageLoading } = useRequest(async () => {
    const pageHtml = await getPageContent(slug)
    const objectUrl = URL.createObjectURL(new Blob([pageHtml], { type: 'text/html' }))
    return objectUrl
  }, {
    refreshDeps: [pageId],
  })
  useEffect(() => {
    return () => {
      pageContentUrl && URL.revokeObjectURL(pageContentUrl)
    }
  }, [pageContentUrl])

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="fixed z-20 flex w-screen items-center justify-between border-b border-border bg-background/80 px-2 py-2 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={goHome}>
          <House className="h-5 w-5" />
        </Button>
        <PoweredBy />
      </div>
      <div className="flex flex-1 pt-20">
        <nav className="hidden items-center justify-center p-2 xl:flex">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </nav>
        <div className="flex-1 p-4 pt-0">
          {
          (pageLoading || getNextLoading)
            ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
              )
            : (
              <iframe
                src={pageContentUrl}
                className="h-full w-full rounded-lg border border-border bg-card"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
              )
        }
        </div>
        <nav className="hidden items-center justify-center p-2 xl:flex">
          <Button variant="ghost" size="icon" onClick={() => goNext(Number(slug))} className="h-full">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </nav>
      </div>
    </main>
  )
}

export default ShowcasePage
