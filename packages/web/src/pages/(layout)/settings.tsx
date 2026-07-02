import { useTranslation } from 'react-i18next'
import { useTheme } from '@web-archive/shared/components/theme-provider'
import LanguageCombobox from '@web-archive/shared/components/language-combobox'
import { cn } from '@web-archive/shared/utils'
import AITagSettingsCard from '~/components/ai-tag-settings-card'

const THEME_OPTIONS = [
  { value: 'light', labelKey: 'light-web' },
  { value: 'dark', labelKey: 'dark-web' },
  { value: 'system', labelKey: 'system-web' },
] as const

function AppearanceCard() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <h3 className="text-[15px] font-extrabold text-foreground">{t('appearance')}</h3>
      <p className="mb-5 mt-0.5 text-[12.5px] text-muted-foreground">{t('appearance-desc')}</p>

      <div className="flex items-center justify-between gap-4 py-3">
        <span className="text-sm font-semibold text-foreground">{t('color-theme-label')}</span>
        <div className="flex gap-0.5 rounded-field border border-border-strong bg-surface-2 p-[3px]">
          {THEME_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                'rounded-iconbtn px-3.5 py-1.5 text-[13px] font-semibold',
                theme === option.value
                  ? 'bg-surface text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-muted-foreground',
              )}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="my-1 h-px bg-border" />

      <div className="flex items-center justify-between gap-4 py-3">
        <span className="text-sm font-semibold text-foreground">{t('interface-language')}</span>
        {/* Shared combobox; restyle its trigger button to the design's 10px-radius bordered field */}
        <div className="[&>button:hover]:border-primary [&>button:hover]:bg-surface-2 [&>button:hover]:text-foreground [&>button]:h-auto [&>button]:w-auto [&>button]:gap-2 [&>button]:rounded-btn [&>button]:border-border-strong [&>button]:bg-surface-2 [&>button]:px-3.5 [&>button]:py-2 [&>button]:text-[13px] [&>button]:font-semibold">
          <LanguageCombobox />
        </div>
      </div>
    </section>
  )
}

function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-[760px] animate-fade-up flex-col gap-5">
      <AppearanceCard />
      <AITagSettingsCard />
    </div>
  )
}

export default SettingsPage
