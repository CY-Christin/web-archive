import { memo } from 'react'
import { useTranslation } from 'react-i18next'

const LoadingMore = memo(() => {
  const { t } = useTranslation()
  return (
    <div className="w-full h-16 flex flex-col items-center justify-center gap-2 mt-2">
      <div className="h-8 w-8 animate-spin border-4 border-t-transparent rounded-full border-primary"></div>
      <div className="text-sm text-muted-foreground">{t('loading-more')}</div>
    </div>
  )
})

export default LoadingMore
