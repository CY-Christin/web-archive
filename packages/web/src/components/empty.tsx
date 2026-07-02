import { useTranslation } from 'react-i18next'
import { cn } from '@web-archive/shared/utils'

// Restrained empty state matching the search page pattern (extraction §7):
// centered 72px block, 15px/700 muted title + 13px faint description.
function Empty({ className, title, desc }: { className?: string, title?: string, desc?: string }) {
  const { t } = useTranslation()
  return (
    <div className={cn('py-[72px] text-center', className)}>
      <div className="mb-1.5 text-[15px] font-bold text-muted-foreground">{title ?? t('empty-title')}</div>
      <div className="text-[13px] text-faint">{desc ?? t('empty-desc')}</div>
    </div>
  )
}

export default Empty
