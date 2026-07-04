import type { AITagConfig } from 'types/config'

export type GenerateTagProps = {
  title: string
  pageDesc: string
} & AITagConfig

interface GenerateTagResponse {
  choices: [
    {
      message: {
        content: string
        role: string
      }
    },
  ]
  created: number
  id: string
  model: string
  usage: {
    completion_tokens: number
    prompt_tokens: number
    total_tokens: number
  }
}

export function buildGenerateTagMessage(props: {
  title: string
  pageDesc: string
  tagLanguage: string
  preferredTags: string[]
}) {
  return [
    {
      role: 'system' as const,
      content: generateChatCompletion(props.tagLanguage, props.preferredTags),
    },
    {
      role: 'user' as const,
      content: JSON.stringify({
        title: props.title,
        pageDesc: props.pageDesc,
      }),
    },
  ]
}

function generateChatCompletion(tagLanguage: string, preferredTags: string[]): string {
  return `What tags would you give to the input content? Please follow these rules:
    1. Use ${tagLanguage === 'zh' ? 'chinese' : 'english'} for most tags
    2. Keep common technical terms and abbreviations as-is
    3. Keep brand names in their original form
    4. Note that tags should be keywords related to the content, not explanations of the content
    5. Return format must be: {"tags": ["tag1", "tag2", ...]}
    6. Do not return any explanatory text
    7. Please prioritize these tags and add other relevant tags based on the content: [${preferredTags.join(', ')}]
    8. Keep tags concise and focused. Return no more than 5 tags in total
    9. Select the most representative and important tags only
  `
}

// Auth headers for an OpenAI-compatible endpoint. `apiKey` is the upstream provider key;
// `gatewayToken` targets Cloudflare AI Gateway (Authenticated Gateway) via `cf-aig-authorization`.
// Either may be absent: with a key stored in the gateway (BYOK) only the token is needed.
export function buildOpenAIAuthHeaders(props: { apiKey?: string, gatewayToken?: string }): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (props.apiKey)
    headers.Authorization = `Bearer ${props.apiKey}`
  if (props.gatewayToken)
    headers['cf-aig-authorization'] = `Bearer ${props.gatewayToken}`
  return headers
}

// Pull a human-readable message out of a failed response. Handles the OpenAI error shape
// ({error:{message}}), the Cloudflare API/AI Gateway shape ({errors:[{message}]}), and
// plain-text bodies (e.g. DeepSeek's bare "Authentication Fails" 401).
export async function extractOpenAIErrorMessage(res: Response): Promise<string> {
  const raw = await res.text().catch(() => '')
  try {
    const content = JSON.parse(raw) as { error?: { message?: string }, errors?: Array<{ message?: string }> }
    const message = content?.error?.message ?? content?.errors?.[0]?.message
    if (message)
      return message
  }
  catch {
    // not JSON — fall through to the raw text
  }
  const text = raw.trim()
  return text ? text.slice(0, 300) : `Request failed with status ${res.status}`
}

// Normalize an OpenAI-compatible base URL into a full chat/completions endpoint.
// Accepts either a base URL (https://api.deepseek.com, https://api.openai.com/v1)
// or an already-complete endpoint (…/chat/completions, …/completions) for backward compatibility.
export function joinCompletionsUrl(baseUrl: string): string {
  const trimmed = (baseUrl ?? '').trim().replace(/\/+$/, '')
  if (trimmed.endsWith('/chat/completions') || trimmed.endsWith('/completions')) {
    return trimmed
  }
  return `${trimmed}/chat/completions`
}

// Build the chat messages for summarizing a page into a short bookmark description.
export function buildDescriptionMessage(props: { title: string, content: string, tagLanguage: string }) {
  const lang = props.tagLanguage === 'zh' ? 'Chinese' : 'English'
  return [
    {
      role: 'system' as const,
      content: `Summarize the web page into a concise ${lang} description for a bookmark: one or two sentences, no more than 60 words, capturing what the page is about. Return only the description text — no quotes, no labels, no explanation.`,
    },
    {
      role: 'user' as const,
      content: JSON.stringify({ title: props.title, content: props.content.slice(0, 6000) }),
    },
  ]
}

export async function generateDescriptionByOpenAI(props: { model: string, baseUrl: string, apiKey?: string, gatewayToken?: string, title: string, content: string, tagLanguage: string }): Promise<string> {
  const res = await fetch(joinCompletionsUrl(props.baseUrl), {
    method: 'POST',
    headers: buildOpenAIAuthHeaders(props),
    body: JSON.stringify({
      model: props.model,
      messages: buildDescriptionMessage(props),
      max_tokens: 200,
    }),
  })
  if (!res.ok) {
    throw new Error(await extractOpenAIErrorMessage(res))
  }
  const data = await res.json() as { choices: [{ message: { content: string } }] }
  return (data.choices[0]?.message?.content ?? '').trim()
}

// Build the chat messages for tagging a page, where every tag also carries a
// fitting emoji. Reuses `preferredTags` so the model favours the existing tag
// vocabulary instead of inventing near-duplicates.
export function buildTagWithIconMessage(props: { title: string, content: string, tagLanguage: string, preferredTags: string[] }) {
  const lang = props.tagLanguage === 'zh' ? 'Chinese' : 'English'
  const prefer = props.preferredTags.length > 0 ? props.preferredTags.join(', ') : '(none yet)'
  return [
    {
      role: 'system' as const,
      content: `Assign 2 to 4 tags describing the web page. Rules:
1. Tag names in ${lang}; keep technical terms, abbreviations and brand names in their original form.
2. Tags are concise content keywords, not sentences or explanations.
3. Strongly prefer reusing these existing tags when any of them fit, before inventing new ones: [${prefer}].
4. Give every tag exactly one emoji that fits its meaning.
5. Return ONLY compact JSON: {"tags":[{"name":"tag","icon":"🙂"}]}. No other text.`,
    },
    {
      role: 'user' as const,
      content: JSON.stringify({ title: props.title, content: props.content.slice(0, 6000) }),
    },
  ]
}

// Parse the {"tags":[{name,icon}]} payload defensively (models add stray text,
// return empty, or get truncated — never throw, just yield no tags).
export function parseTagsWithIcon(raw: string): Array<{ name: string, icon: string }> {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start)
    return []
  let parsed: { tags?: Array<{ name?: string, icon?: string }> }
  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  }
  catch {
    return []
  }
  if (!parsed?.tags || !Array.isArray(parsed.tags))
    return []
  return parsed.tags
    .filter(t => t && typeof t.name === 'string' && t.name.trim())
    .slice(0, 5)
    .map(t => ({ name: t.name!.trim(), icon: typeof t.icon === 'string' ? t.icon.trim().slice(0, 16) : '' }))
}

export async function generateTagsWithIconByOpenAI(props: { model: string, baseUrl: string, apiKey?: string, gatewayToken?: string, title: string, content: string, tagLanguage: string, preferredTags: string[] }): Promise<Array<{ name: string, icon: string }>> {
  const res = await fetch(joinCompletionsUrl(props.baseUrl), {
    method: 'POST',
    headers: buildOpenAIAuthHeaders(props),
    body: JSON.stringify({
      model: props.model,
      messages: buildTagWithIconMessage(props),
      max_tokens: 400,
      // Force complete, valid JSON (avoids truncated/preamble output that fails to parse).
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    throw new Error(await extractOpenAIErrorMessage(res))
  }
  const data = await res.json() as { choices: [{ message: { content: string } }] }
  return parseTagsWithIcon(data.choices[0]?.message?.content ?? '')
}

// Lightweight connectivity check: send a trivial "你好" and confirm the endpoint
// answers. Avoids the full tag-generation round-trip just to verify credentials.
export async function testOpenAIConnection(props: { model: string, baseUrl: string, apiKey?: string, gatewayToken?: string }): Promise<void> {
  const res = await fetch(joinCompletionsUrl(props.baseUrl), {
    method: 'POST',
    headers: buildOpenAIAuthHeaders(props),
    body: JSON.stringify({
      model: props.model,
      messages: [{ role: 'user', content: '你好' }],
      max_tokens: 5,
    }),
  })
  if (!res.ok) {
    throw new Error(await extractOpenAIErrorMessage(res))
  }
}

export async function generateTagByOpenAI(props: GenerateTagProps): Promise<Array<string>> {
  if (props.type !== 'openai' && props.type !== 'cloudflare-gateway') {
    throw new Error('Invalid AI tag config')
  }
  const res = await fetch(joinCompletionsUrl(props.baseUrl), {
    method: 'POST',
    headers: buildOpenAIAuthHeaders(props),
    body: JSON.stringify({
      messages: buildGenerateTagMessage(props),
      model: props.model,
    }),
  })

  if (!res.ok) {
    const content = await res.json()
    throw new Error(content.error.message)
  }

  try {
    const data = await res.json() as GenerateTagResponse
    const content = data.choices[0].message.content
    const tagJson = JSON.parse(content)
    return tagJson.tags.slice(0, 5)
  }
  catch (error) {
    throw new Error('Failed to parse response, please try again or change model')
  }
}
