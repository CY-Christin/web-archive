enum ConfigKey {
  shouldShowRecent = 'config/should_show_recent',
  aiTag = 'config/ai_tag',
}

type AITagConfig = CloudFlareAITagConfig | OpenAIConfig | CloudflareGatewayConfig

interface BaseAITagConfig {
  // Master switch for AI auto description/tagging on upload.
  // Absent means enabled (configs saved before this field existed).
  enabled?: boolean
  tagLanguage: 'en' | 'zh'
  model: string
  preferredTags: string[]
}

interface CloudFlareAITagConfig extends BaseAITagConfig {
  type: 'cloudflare'
}

interface OpenAIConfig extends BaseAITagConfig {
  type: 'openai'
  apiKey: string
  // Base URL of an OpenAI-compatible endpoint, e.g. https://api.deepseek.com or https://api.openai.com/v1.
  // A full `.../chat/completions` URL is also accepted (see joinCompletionsUrl) for backward compatibility.
  baseUrl: string
}

interface CloudflareGatewayConfig extends BaseAITagConfig {
  type: 'cloudflare-gateway'
  // Gateway endpoint, e.g. https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway>/compat
  // or a provider path like .../<gateway>/deepseek; /chat/completions is appended (see joinCompletionsUrl).
  baseUrl: string
  // Authenticated Gateway token, sent as `cf-aig-authorization: Bearer <token>`.
  gatewayToken: string
  // Upstream provider key; optional because the key can be stored in the gateway (BYOK).
  apiKey?: string
}

export { ConfigKey, AITagConfig, OpenAIConfig, CloudFlareAITagConfig, CloudflareGatewayConfig }
