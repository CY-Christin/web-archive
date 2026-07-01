import { Button } from '@web-archive/shared/components/button'
import { ScrollArea } from '@web-archive/shared/components/scroll-area'
import { useRequest } from 'ahooks'
import { ArchiveRestore } from 'lucide-react'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import EmptyWrapper from '~/components/empty-wrapper'
import ListView from '~/components/list-view'
import { clearDeletedPage, queryDeletedPage, restorePage } from '~/data/page'

function Trash() {
  const { t } = useTranslation()
  const { data, run: fetchPage } = useRequest(queryDeletedPage, {
    manual: true,
  })
  const { run: runRestorePage } = useRequest(restorePage, {
    manual: true,
    onSuccess: () => {
      toast.success(t('restore-page-success'))
      fetchPage()
    },
  })
  const { run: runClearDeletedPage } = useRequest(clearDeletedPage, {
    manual: true,
    onSuccess: () => {
      toast.success(t('clear-success'))
      fetchPage()
    },
  })

  const handleClearAll = () => {
    window.confirm(t('clear-confirm')) && runClearDeletedPage()
  }

  useEffect(() => {
    fetchPage()
  }, [])

  return (
    <div className="flex h-screen flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-semibold text-foreground">{t('trash')}</h1>
          {data !== undefined && (
            <p className="text-xs text-muted-foreground">{t('n-items', { count: data.length })}</p>
          )}
        </div>
        <Button variant="destructive" size="sm" className="shrink-0" onClick={handleClearAll}>
          {t('clear-all')}
        </Button>
      </div>
      <ScrollArea className="flex-1 overflow-auto">
        <div className="p-6">
          <EmptyWrapper empty={data?.length === 0}>
            <ListView pages={data}>
              {page => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    runRestorePage(page.id)
                  }}
                >
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              )}
            </ListView>
          </EmptyWrapper>
        </div>
      </ScrollArea>
    </div>
  )
}

export default Trash
