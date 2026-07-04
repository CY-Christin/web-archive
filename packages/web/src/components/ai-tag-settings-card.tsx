import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRequest } from 'ahooks'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@web-archive/shared/components/form'
import { Input } from '@web-archive/shared/components/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web-archive/shared/components/select'
import { Switch } from '@web-archive/shared/components/switch'
import { cn } from '@web-archive/shared/utils'
import LoadingWrapper from './loading-wrapper'
import AITagTestConnectionButton from './ai-tag-test-connection-button'
import { getAITagConfig, setAITagConfig } from '~/data/config'

const OPENAI_PRESETS: Record<'openai' | 'deepseek', { baseUrl: string, model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
}

// 42px field on surface-2 per extraction §2; focus ring pattern shared with topbar search
const monoInputClass = 'h-[42px] rounded-field border-border-strong bg-surface-2 px-[13px] font-mono text-[12.5px] placeholder:text-faint focus:border-primary focus:shadow-focus-ring'
const selectTriggerClass = 'h-[42px] rounded-field border-border-strong bg-surface-2 px-[13px] text-[13.5px] font-semibold hover:border-primary focus:border-primary focus:shadow-focus-ring focus:ring-0 focus:ring-offset-0'
const labelClass = 'mb-[7px] block text-xs font-semibold text-muted-foreground'
const helpTextClass = 'mt-1.5 text-xs leading-relaxed text-faint'

function PreferredTagsInput({ value, onChange }: { value: string[], onChange: (tags: string[]) => void }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')

  const commitDraft = () => {
    const tag = draft.trim()
    if (tag && !value.includes(tag))
      onChange([...value, tag])
    setDraft('')
  }

  return (
    <div className="flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-field border border-border-strong bg-surface-2 px-2.5 py-1.5 focus-within:border-primary focus-within:shadow-focus-ring">
      {value.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-[5px] rounded-full bg-accent-soft px-[9px] py-[3px] font-mono text-[11.5px] text-primary"
        >
          {tag}
          <button
            type="button"
            aria-label={`${t('delete')} ${tag}`}
            className="leading-none hover:opacity-70"
            onClick={() => onChange(value.filter(v => v !== tag))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={t('add-tag-placeholder')}
        className="min-w-[80px] flex-1 bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-faint"
        onChange={e => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          // IME guard: Enter that confirms a composition must not commit the chip
          if (e.nativeEvent.isComposing)
            return
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commitDraft()
          }
          else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1))
          }
        }}
      />
    </div>
  )
}

function AITagSettingsCard() {
  const { t } = useTranslation()
  const [preset, setPreset] = useState<'openai' | 'deepseek' | 'custom'>('custom')

  const formSchema = z.discriminatedUnion('type', [
    z.object({
      type: z.literal('cloudflare'),
      enabled: z.boolean().optional(),
      tagLanguage: z.enum(['en', 'zh']),
      model: z.string().min(1, { message: t('model-name-is-required') }),
      preferredTags: z.array(z.string()),
    }),
    z.object({
      type: z.literal('openai'),
      enabled: z.boolean().optional(),
      tagLanguage: z.enum(['en', 'zh']),
      model: z.string().min(1, { message: t('model-name-is-required') }),
      preferredTags: z.array(z.string()),
      baseUrl: z.string().url({ message: t('please-enter-a-valid-base-url') }),
      apiKey: z.string().min(1, { message: t('api-key-is-required') }),
    }),
    z.object({
      type: z.literal('cloudflare-gateway'),
      enabled: z.boolean().optional(),
      tagLanguage: z.enum(['en', 'zh']),
      model: z.string().min(1, { message: t('model-name-is-required') }),
      preferredTags: z.array(z.string()),
      baseUrl: z.string().url({ message: t('please-enter-a-valid-base-url') }),
      gatewayToken: z.string().min(1, { message: t('gateway-token-is-required') }),
      // Optional: omit when the provider key is stored in the gateway (BYOK).
      apiKey: z.string().optional(),
    }),
  ])

  const form = useForm<z.infer<typeof formSchema>>({
    // gatewayToken only exists on the cloudflare-gateway member, but the form keeps all
    // fields registered across type switches, so seed it here too (hence the cast).
    defaultValues: {
      type: 'openai',
      enabled: true,
      tagLanguage: 'en',
      baseUrl: '',
      apiKey: '',
      gatewayToken: '',
      model: '',
      preferredTags: [],
    } as z.infer<typeof formSchema>,
    resolver: zodResolver(formSchema),
  })

  const { loading } = useRequest(
    getAITagConfig,
    {
      onSuccess: (data) => {
        form.reset(data)
        if (data.type === 'openai') {
          const matched = (Object.keys(OPENAI_PRESETS) as Array<'openai' | 'deepseek'>)
            .find(key => OPENAI_PRESETS[key].baseUrl === data.baseUrl)
          setPreset(matched ?? 'custom')
        }
      },
    },
  )

  const { run: setAITagConfigRun, loading: saveConfigLoading } = useRequest(setAITagConfig, {
    manual: true,
    onSuccess: () => {
      toast.success(t('ai-tag-config-saved'))
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const serviceType = form.watch('type')

  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <LoadingWrapper loading={loading}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(setAITagConfigRun)}>
            {/* Header: title + BETA badge + desc, enable switch on the right */}
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-extrabold text-foreground">{t('ai-tag')}</h3>
                  <span className="rounded-full bg-accent-soft px-[7px] py-0.5 font-mono text-[10px] font-semibold text-primary">
                    BETA
                  </span>
                </div>
                <p className="mt-1 max-w-[52ch] text-[12.5px] leading-[1.55] text-muted-foreground">
                  {t('aiTag-desc')}
                </p>
              </div>
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Switch
                        aria-label={t('enable-ai-tag')}
                        // absent means enabled (configs saved before this switch existed)
                        checked={field.value !== false}
                        onCheckedChange={field.onChange}
                        // design knob is white in both themes (thumb defaults to bg-background)
                        className="h-[26px] w-11 [&>span]:bg-white"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 desk:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={labelClass}>{t('aiTag-service-type')}</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder={t('select-service-type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cloudflare">Cloudflare Workers AI</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="cloudflare-gateway">Cloudflare AI Gateway</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {serviceType === 'cloudflare-gateway' && (
                      <p className={helpTextClass}>{t('aiTag-gateway-desc')}</p>
                    )}
                    {serviceType === 'cloudflare' && (
                      <p className={helpTextClass}>
                        {t('aiTag-cloudflare-desc')}
                        <a
                          className="font-semibold underline hover:text-primary"
                          href="https://developers.cloudflare.com/workers-ai/platform/pricing/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('aiTag-cloudflare-pricing')}
                        </a>
                        .
                      </p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tagLanguage"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={labelClass}>{t('aiTag-generate-tag-language')}</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder={t('select-generate-tag-language')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="zh">简体中文</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              {serviceType === 'openai' && (
                <FormItem className="space-y-0 desk:col-span-2">
                  <FormLabel className={labelClass}>{t('aiTag-provider-preset')}</FormLabel>
                  <Select
                    value={preset}
                    onValueChange={(value: 'openai' | 'deepseek' | 'custom') => {
                      setPreset(value)
                      if (value !== 'custom') {
                        form.setValue('baseUrl', OPENAI_PRESETS[value].baseUrl, { shouldValidate: true })
                        form.setValue('model', OPENAI_PRESETS[value].model, { shouldValidate: true })
                      }
                    }}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder={t('aiTag-provider-preset')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="deepseek">DeepSeek</SelectItem>
                      <SelectItem value="custom">{t('aiTag-provider-custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className={helpTextClass}>{t('aiTag-provider-preset-desc')}</p>
                </FormItem>
              )}

              {(serviceType === 'openai' || serviceType === 'cloudflare-gateway') && (
                <FormField
                  control={form.control}
                  name="baseUrl"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={labelClass}>{t('base-url')}</FormLabel>
                      <FormControl>
                        <Input
                          showRing={false}
                          className={monoInputClass}
                          placeholder={serviceType === 'cloudflare-gateway'
                            ? 'https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway>/compat'
                            : 'https://api.deepseek.com'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="mt-1.5 text-xs" />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={labelClass}>{t('model')}</FormLabel>
                    <FormControl>
                      <Input
                        showRing={false}
                        className={monoInputClass}
                        placeholder={serviceType === 'cloudflare'
                          ? '@cf/mistral/mistral-7b-instruct-v0.1/...'
                          : serviceType === 'cloudflare-gateway'
                            ? 'deepseek/deepseek-chat (compat) / deepseek-chat'
                            : 'deepseek-chat / gpt-4o-mini / ...'}
                        {...field}
                      />
                    </FormControl>
                    {serviceType === 'cloudflare' && (
                      <p className={helpTextClass}>
                        {t('aitag-model-desc')}
                        <a
                          className="font-semibold underline hover:text-primary"
                          href="https://developers.cloudflare.com/workers-ai/models/mistral-7b-instruct-v0.1/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          mistral-7b-instruct-v0.1
                        </a>
                        .
                      </p>
                    )}
                    <FormMessage className="mt-1.5 text-xs" />
                  </FormItem>
                )}
              />

              {serviceType === 'cloudflare-gateway' && (
                <FormField
                  control={form.control}
                  name="gatewayToken"
                  render={({ field }) => (
                    <FormItem className="space-y-0 desk:col-span-2">
                      <FormLabel className={labelClass}>Gateway Token</FormLabel>
                      <FormControl>
                        <Input
                          showRing={false}
                          type="password"
                          className={monoInputClass}
                          placeholder="cf-aig-authorization"
                          {...field}
                        />
                      </FormControl>
                      <p className={helpTextClass}>{t('aiTag-gateway-token-desc')}</p>
                      <FormMessage className="mt-1.5 text-xs" />
                    </FormItem>
                  )}
                />
              )}

              {(serviceType === 'openai' || serviceType === 'cloudflare-gateway') && (
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem className="space-y-0 desk:col-span-2">
                      <FormLabel className={labelClass}>
                        {serviceType === 'cloudflare-gateway' ? `API Key (${t('optional')})` : 'API Key'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          showRing={false}
                          type="password"
                          className={monoInputClass}
                          placeholder="API Key"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      {serviceType === 'cloudflare-gateway' && (
                        <p className={helpTextClass}>{t('aiTag-gateway-apikey-desc')}</p>
                      )}
                      <FormMessage className="mt-1.5 text-xs" />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="preferredTags"
                render={({ field }) => (
                  <FormItem className="space-y-0 desk:col-span-2">
                    <FormLabel className={labelClass}>{t('preferred-tags')}</FormLabel>
                    <FormControl>
                      <PreferredTagsInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-[22px] flex gap-2.5">
              <AITagTestConnectionButton
                getConfig={() => form.getValues()}
                onValidate={() => form.trigger()}
              />
              <button
                type="submit"
                disabled={saveConfigLoading}
                className={cn(
                  'h-[42px] rounded-field bg-primary px-5 text-[13.5px] font-bold text-white hover:bg-primary-hover',
                  'disabled:pointer-events-none disabled:opacity-60',
                )}
              >
                {t('save-config')}
              </button>
            </div>
          </form>
        </Form>
      </LoadingWrapper>
    </section>
  )
}

export default AITagSettingsCard
