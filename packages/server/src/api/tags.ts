import { buildGenerateTagMessage, buildTagWithIconMessage, generateTagByOpenAI, generateTagsWithIconByOpenAI, isNil, isNumberString, parseTagsWithIcon, testOpenAIConnection } from '@web-archive/shared/utils'
import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { z } from 'zod'
import type { HonoTypeUserInformation } from '~/constants/binding'
import { deleteTagById, insertTag, selectAllTags, updateTag } from '~/model/tag'
import result from '~/utils/result'

const app = new Hono<HonoTypeUserInformation>()

app.get('/all', async (c) => {
  const tags = await selectAllTags(c.env.DB)

  return c.json(result.success(tags))
})

app.post(
  '/create',
  validator('json', (value, c) => {
    if (isNil(value.name) || typeof value.name !== 'string') {
      return c.json(result.error(400, 'Name is required'))
    }
    // todo check color type?
    return {
      name: value.name as string,
      color: value.color,
    }
  }),
  async (c) => {
    const { name, color = '#ffffff' } = c.req.valid('json')

    if (await insertTag(c.env.DB, { name, color })) {
      return c.json(result.success(true))
    }

    return c.json(result.error(500, 'Failed to create tag'))
  },
)

app.post(
  '/update',
  validator('json', (value, c) => {
    if (isNil(value.id) || !isNumberString(value.id)) {
      return c.json(result.error(400, 'ID is required'))
    }
    if (isNil(value.name) && isNil(value.color) && value.icon === undefined) {
      return c.json(result.error(400, 'At least one field is required'))
    }

    return {
      id: Number(value.id),
      name: value.name,
      color: value.color,
      icon: value.icon as string | undefined,
    }
  }),
  async (c) => {
    const { id, name, color, icon } = c.req.valid('json')

    if (await updateTag(c.env.DB, { id, name, color, icon })) {
      return c.json(result.success(true))
    }

    return c.json(result.error(500, 'Failed to update tag'))
  },
)

app.delete(
  '/delete',
  validator('query', (value, c) => {
    if (isNil(value.id) || !isNumberString(value.id)) {
      return c.json(result.error(400, 'ID is required'))
    }
    return {
      id: Number(value.id),
    }
  }),
  async (c) => {
    const { id } = c.req.valid('query')

    if (await deleteTagById(c.env.DB, id)) {
      return c.json(result.success(true))
    }

    return c.json(result.error(500, 'Failed to delete tag'))
  },
)

app.post(
  '/test_connection',
  validator('json', (value, c) => {
    const schema = z.object({
      model: z.string({ message: 'Model name is required' }).min(1, { message: 'Model name is required' }),
      type: z.enum(['cloudflare', 'openai', 'cloudflare-gateway']).optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      gatewayToken: z.string().optional(),
    }).refine(
      v => v.type !== 'openai' || (!!v.baseUrl && !!v.apiKey),
      { message: 'Base URL and API Key are required for the OpenAI provider' },
    ).refine(
      v => v.type !== 'cloudflare-gateway' || (!!v.baseUrl && !!v.gatewayToken),
      { message: 'Base URL and Gateway Token are required for the Cloudflare AI Gateway provider' },
    )
    const parsed = schema.safeParse(value)
    if (!parsed.success)
      return c.json(result.error(400, parsed.error.errors[0]?.message ?? 'Invalid request'))
    return parsed.data
  }),
  async (c) => {
    const { model, type, baseUrl, apiKey, gatewayToken } = c.req.valid('json')
    try {
      if (type === 'openai' || type === 'cloudflare-gateway') {
        await testOpenAIConnection({ model, baseUrl: baseUrl as string, apiKey, gatewayToken })
      }
      else {
        const res = await c.env.AI.run(
          model,
          { messages: [{ role: 'user', content: '你好' }] },
        )
        if (!res)
          throw new Error('No response from Workers AI')
      }
      return c.json(result.success(null))
    }
    catch (error) {
      return c.json(result.error(500, error instanceof Error ? error.message : 'Connection test failed'))
    }
  },
)

app.post(
  '/generate_tag',
  validator('json', (value, c) => {
    const schema = z.object({
      title: z.string({ message: 'Title is required' }).min(1, { message: 'Title is required' }),
      pageDesc: z.string().default(''),
      model: z.string({ message: 'Model name is required' }).min(1, { message: 'Model name is required' }),
      tagLanguage: z.enum(['en', 'zh'], { message: 'Invalid tag language' }),
      preferredTags: z.array(z.string()).default([]),
      // true -> tags come back as {name, icon}[] via the emoji pipeline (same as the
      // post-upload auto-tagging); omitted/false keeps the legacy string[] shape for the plugin.
      withIcon: z.boolean().default(false),
      // When type is 'openai' or 'cloudflare-gateway' the generation runs server-side against an
      // OpenAI-compatible endpoint (avoids browser CORS + keeps the key off the client).
      // Omitted/cloudflare uses Workers AI.
      type: z.enum(['cloudflare', 'openai', 'cloudflare-gateway']).optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      gatewayToken: z.string().optional(),
    }).refine(
      v => v.type !== 'openai' || (!!v.baseUrl && !!v.apiKey),
      { message: 'Base URL and API Key are required for the OpenAI provider' },
    ).refine(
      v => v.type !== 'cloudflare-gateway' || (!!v.baseUrl && !!v.gatewayToken),
      { message: 'Base URL and Gateway Token are required for the Cloudflare AI Gateway provider' },
    )
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      if (parsed.error.errors.length > 0) {
        return c.json(result.error(400, parsed.error.errors[0].message))
      }
      return c.json(result.error(400, 'Invalid request'))
    }
    return parsed.data
  }),
  async (c) => {
    const { title, pageDesc, model, tagLanguage, preferredTags, type, baseUrl, apiKey, gatewayToken, withIcon } = c.req.valid('json')

    // withIcon: same emoji pipeline as the post-upload auto-tagging, so tags
    // generated from the edit dialog carry an icon too. Returns {name, icon}[].
    if (withIcon) {
      try {
        let tags: Array<{ name: string, icon: string }> = []
        if (type === 'openai' || type === 'cloudflare-gateway') {
          tags = await generateTagsWithIconByOpenAI({
            model,
            baseUrl: baseUrl as string,
            apiKey,
            gatewayToken,
            title,
            content: pageDesc,
            tagLanguage,
            preferredTags,
          })
        }
        else {
          const res = await c.env.AI.run(model, {
            messages: buildTagWithIconMessage({ title, content: pageDesc, tagLanguage, preferredTags }),
          })
          tags = typeof res?.response === 'string' ? parseTagsWithIcon(res.response) : []
        }
        return c.json(result.success(tags))
      }
      catch (error) {
        if (error instanceof Error) {
          return c.json(result.error(500, error.message))
        }
        return c.json(result.error(500, 'Failed to generate tags'))
      }
    }

    // OpenAI-compatible provider (OpenAI / DeepSeek / AI Gateway / custom): run server-side to avoid browser CORS.
    if (type === 'openai' || type === 'cloudflare-gateway') {
      try {
        const tags = await generateTagByOpenAI({
          type,
          title,
          pageDesc,
          model,
          tagLanguage,
          preferredTags,
          baseUrl: baseUrl as string,
          apiKey: apiKey as string,
          gatewayToken: gatewayToken as string,
        })
        return c.json(result.success(tags))
      }
      catch (error) {
        if (error instanceof Error) {
          return c.json(result.error(500, error.message))
        }
        return c.json(result.error(500, 'Failed to generate tags'))
      }
    }

    try {
      const res = await c.env.AI.run(
        model,
        {
          messages: buildGenerateTagMessage({ title, pageDesc, tagLanguage, preferredTags }),
        },
      )

      try {
        if (res instanceof ReadableStream) {
          throw new TypeError('Failed to parse response stream')
        }
        if (typeof res.response !== 'string') {
          throw new TypeError('Failed to parse response, please try again or change model')
        }
        const { tags } = JSON.parse(res.response)
        return c.json(result.success(tags.slice(0, 5)))
      }
      catch (error) {
        console.log(res)
        return c.json(result.error(500, 'Failed to parse response, please try again or change model'))
      }
    }
    catch (error) {
      if (error instanceof Error) {
        return c.json(result.error(500, error.message))
      }
      return c.json(result.error(500, 'Failed to generate tags'))
    }
  },
)

export default app
