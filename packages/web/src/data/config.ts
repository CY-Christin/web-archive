import type { AITagConfig } from '@web-archive/shared/types'
import fetcher from '~/utils/fetcher'

async function getAITagConfig(): Promise<AITagConfig> {
  return fetcher('/config/ai_tag', {
    method: 'GET',
  })
}

async function setAITagConfig(config: AITagConfig) {
  return fetcher('/config/ai_tag', {
    method: 'POST',
    body: { ...config },
  })
}

export {
  getAITagConfig,
  setAITagConfig,
}
