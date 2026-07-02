import { useRequest } from 'ahooks'
import { Globe, RotateCcw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import EmptyWrapper from '~/components/empty-wrapper'
import { clearDeletedPage, hardDeletePage, queryDeletedPage, restorePage } from '~/data/page'
import { formatLocalDate } from '~/utils/date'

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return ''
  }
}

function Trash() {
  const { t } = useTranslation()
  // queryDeletedPage also lazily purges items deleted more than 30 days ago
  // server-side, which keeps the header copy truthful.
  const { data, refresh } = useRequest(queryDeletedPage)
  const { run: runRestorePage } = useRequest(restorePage, {
    manual: true,
    onSuccess: () => {
      toast.success(t('restore-page-success'))
      refresh()
    },
  })
  const { run: runClearDeletedPage } = useRequest(clearDeletedPage, {
    manual: true,
    onSuccess: () => {
      toast.success(t('clear-success'))
      refresh()
    },
  })
  const { run: runHardDeletePage } = useRequest(hardDeletePage, {
    manual: true,
    onSuccess: () => {
      toast.success(t('hard-delete-success'))
      refresh()
    },
  })

  const handleClearAll = () => {
    window.confirm(t('clear-confirm')) && runClearDeletedPage()
  }

  const handleHardDelete = (id: number) => {
    window.confirm(t('hard-delete-confirm')) && runHardDeletePage(id)
  }

  return (
    <div className="mx-auto max-w-[1000px] animate-fade-up">
      <div className="mb-[18px] flex items-center justify-between">
        <span className="font-mono text-[12.5px] text-muted-foreground">
          {t('trash-items-count', { count: data?.length ?? 0 })}
        </span>
        <button
          type="button"
          className="flex shrink-0 items-center gap-[7px] rounded-btn border border-transparent bg-danger-soft px-[15px] py-2 text-[13px] font-semibold text-danger hover:bg-danger hover:text-white"
          onClick={handleClearAll}
        >
          <Trash2 size={15} strokeWidth={1.9} />
          {t('empty-trash')}
        </button>
      </div>

      {data && (
        <EmptyWrapper empty={data.length === 0} title={t('trash-empty-title')} desc={t('trash-empty-desc')}>
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            {data.map((page) => {
              const domain = getDomain(page.pageUrl)
              const date = formatLocalDate(page.deletedAt)
              return (
                <div key={page.id} className="flex items-center gap-4 border-b border-border px-[18px] py-[15px]">
                  <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-btn bg-surface-2 text-faint">
                    <Globe size={18} strokeWidth={1.6} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-[3px] truncate text-sm font-bold text-muted-foreground">{page.title}</h4>
                    <span className="font-mono text-[11.5px] text-faint">
                      {domain && `${domain} · `}
                      {t('deleted-on-date', { date })}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-1.5 rounded-[9px] bg-accent-soft px-[13px] py-[7px] text-[12.5px] font-semibold text-primary hover:bg-primary hover:text-white"
                    onClick={() => runRestorePage(page.id)}
                  >
                    <RotateCcw size={14} strokeWidth={1.9} />
                    {t('restore')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('delete-permanently')}
                    title={t('delete-permanently')}
                    className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-faint hover:bg-danger-soft hover:text-danger"
                    onClick={() => handleHardDelete(page.id)}
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </div>
              )
            })}
          </div>
        </EmptyWrapper>
      )}
    </div>
  )
}

export default Trash
