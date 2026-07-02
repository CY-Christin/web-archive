import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { GenerateTagProps } from '@web-archive/shared/utils'
import { useRequest } from 'ahooks'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@web-archive/shared/components/tooltip'
import type { AITagConfig } from '@web-archive/shared/types'
import { useTranslation } from 'react-i18next'
import { testAIConnection } from '~/data/tag'

interface Props {
  /** Accessor, not a snapshot: read at click time so edits since the last render are tested. */
  getConfig: () => AITagConfig
  onValidate: () => Promise<boolean>
}

// Lightweight "你好" probe through the server (avoids browser CORS + keeps the key
// server-side). Just verifies the endpoint/model/key answer, not a full tag run.
async function generateTagByConfig(config: GenerateTagProps) {
  return await testAIConnection({
    model: config.model,
    type: config.type,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
  })
}

function AITagTestConnectionButton({ getConfig, onValidate }: Props) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'untested' | 'success' | 'error'>('untested')
  const [error, setError] = useState<string | null>()

  const { runAsync: testConnection, loading } = useRequest(generateTagByConfig, {
    manual: true,
  })

  async function handleTest() {
    const isValid = await onValidate()
    if (!isValid)
      return

    try {
      await testConnection({
        title: 'Test Title',
        pageDesc: 'Test Description',
        ...getConfig(),
      })
      setStatus('success')
    }
    catch (error: any) {
      setStatus('error')
      setError(error?.message)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleTest}
            disabled={loading}
            className="flex h-[42px] items-center gap-2 rounded-field border border-border-strong bg-surface px-[18px] text-[13.5px] font-semibold text-foreground hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-60"
          >
            {loading
              ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {t('testing')}
                </>
                )
              : (
                <>
                  {status === 'untested' && t('test-connection')}
                  {status === 'success' && (
                    <>
                      <Check size={15} className="text-success" />
                      {t('successed')}
                    </>
                  )}
                  {status === 'error' && (
                    <>
                      <AlertCircle size={15} className="text-danger" />
                      {t('failed')}
                    </>
                  )}
                </>
                )}
          </button>
        </TooltipTrigger>
        {
          status === 'error' && (
            <TooltipContent>
              <p className="text-danger">
                {error}
              </p>
            </TooltipContent>
          )
        }

      </Tooltip>
    </TooltipProvider>

  )
}

export default AITagTestConnectionButton
