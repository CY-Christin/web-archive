import { ArrowLeft, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Checkbox } from '@web-archive/shared/components/checkbox'
import { Label } from '@web-archive/shared/components/label'
import { Input } from '@web-archive/shared/components/input'
import { Button } from '@web-archive/shared/components/button'
import { useTranslation } from 'react-i18next'
import { sendMessage } from 'webext-bridge/popup'
import LanguageCombobox from '@web-archive/shared/components/language-combobox'
import { getSingleFileSetting, setSingleFileSetting } from '../utils/singleFile'
import { getCurrentTab } from '../utils/tab'
import type { PageType } from '~/popup/PopupPage'
import type { SingleFileSetting } from '~/utils/singleFile'

function SettingPage({ setActivePage }: { setActivePage: (tab: PageType) => void }) {
  const { t } = useTranslation()
  return (
    <div className="w-80 space-y-2 p-4">
      <div className="h-6 mb-2 items-center flex space-x-3">
        <ArrowLeft
          className="cursor-pointer"
          size={16}
          onClick={() => { setActivePage('home') }}
        >
        </ArrowLeft>
      </div>
      <div className="space-x-3">
        <span className="text-lg font-semibold mb-3 ">
          {t('language')}
        </span>
        <LanguageCombobox></LanguageCombobox>
      </div>
      <div>
        <CaptureCleanupSettings></CaptureCleanupSettings>
      </div>
      <div>
        <SingleFileSettings></SingleFileSettings>
      </div>
    </div>
  )
}

interface ExtensionInfo { id: string, name: string, enabled: boolean }
interface CaptureRule { url: string, extIds: string[] }

function CaptureCleanupSettings() {
  const { t } = useTranslation()
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([])
  const [rules, setRules] = useState<CaptureRule[]>([])
  const [draftUrl, setDraftUrl] = useState('')
  const [draftExtIds, setDraftExtIds] = useState<string[]>([])

  useEffect(() => {
    sendMessage('get-manageable-extensions', {}).then(({ extensions }) => setExtensions(extensions)).catch(() => {})
    sendMessage('get-capture-disable-rules', {}).then(({ rules }) => setRules(rules)).catch(() => {})
    getCurrentTab().then((tab) => {
      if (tab?.url) {
        try {
          setDraftUrl(new URL(tab.url).hostname)
        }
        catch {}
      }
    }).catch(() => {})
  }, [])

  function persist(next: CaptureRule[]) {
    setRules(next)
    sendMessage('set-capture-disable-rules', { rules: next })
  }

  function addRule() {
    const url = draftUrl.trim()
    if (!url || draftExtIds.length === 0)
      return
    persist([...rules, { url, extIds: draftExtIds }])
    setDraftExtIds([])
  }

  function nameOf(id: string) {
    return extensions.find(ext => ext.id === id)?.name ?? id
  }

  return (
    <div className="mb-4">
      <div className="text-lg font-semibold mb-1">{t('capture-cleanup-title')}</div>
      <p className="text-xs text-muted-foreground mb-3">{t('capture-cleanup-desc')}</p>

      {rules.length > 0 && (
        <div className="space-y-2 mb-3">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-start justify-between rounded-md border border-border p-2 text-sm">
              <div className="min-w-0">
                <div className="font-mono text-xs break-all">{rule.url}</div>
                <div className="text-muted-foreground break-all">{rule.extIds.map(nameOf).join(', ')}</div>
              </div>
              <button
                type="button"
                className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => persist(rules.filter((_, idx) => idx !== i))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-md border border-border p-2">
        <Label className="text-xs">{t('capture-cleanup-site')}</Label>
        <Input value={draftUrl} placeholder="v2ex.com" onChange={e => setDraftUrl(e.target.value)} />
        <Label className="text-xs">{t('capture-cleanup-extensions')}</Label>
        {extensions.length === 0
          ? <div className="text-xs text-muted-foreground">{t('capture-cleanup-empty')}</div>
          : (
              <div className="max-h-32 space-y-1 overflow-auto">
                {extensions.map(ext => (
                  <div key={ext.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`draft-${ext.id}`}
                      checked={draftExtIds.includes(ext.id)}
                      onCheckedChange={checked => setDraftExtIds(prev => checked === true ? [...prev, ext.id] : prev.filter(x => x !== ext.id))}
                    >
                    </Checkbox>
                    <Label htmlFor={`draft-${ext.id}`} className="text-sm leading-none">{ext.name}</Label>
                  </div>
                ))}
              </div>
            )}
        <Button
          className="w-full"
          size="sm"
          disabled={!draftUrl.trim() || draftExtIds.length === 0}
          onClick={addRule}
        >
          {t('capture-cleanup-add')}
        </Button>
      </div>
    </div>
  )
}

function SingleFileSettings() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<SingleFileSetting>(getSingleFileSetting())

  function handleChange(checked: boolean | string, key: keyof SingleFileSetting) {
    if (typeof checked === 'string') {
      return
    }
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        [key]: checked,
      }
      setSingleFileSetting(newSettings)
      return newSettings
    })
  }

  return (
    <div>
      <div className="text-lg font-semibold mb-3">{t('singlefile-settings')}</div>
      <div className="flex flex-col space-y-3">
        <SettingCheckBox
          id="removeHiddenElements"
          checked={settings.removeHiddenElements}
          onCheckedChange={checked => handleChange(checked, 'removeHiddenElements')}
          label={t('remove-hidden-elements')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeUnusedStyles"
          checked={settings.removeUnusedStyles}
          onCheckedChange={checked => handleChange(checked, 'removeUnusedStyles')}
          label={t('remove-unused-styles')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeUnusedFonts"
          checked={settings.removeUnusedFonts}
          onCheckedChange={checked => handleChange(checked, 'removeUnusedFonts')}
          label={t('remove-unused-fonts')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeImports"
          checked={settings.removeImports}
          onCheckedChange={checked => handleChange(checked, 'removeImports')}
          label={t('remove-imports')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="blockScripts"
          checked={settings.blockScripts}
          onCheckedChange={checked => handleChange(checked, 'blockScripts')}
          label={t('block-scripts')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="blockAudios"
          checked={settings.blockAudios}
          onCheckedChange={checked => handleChange(checked, 'blockAudios')}
          label={t('block-audios')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="blockVideos"
          checked={settings.blockVideos}
          onCheckedChange={checked => handleChange(checked, 'blockVideos')}
          label={t('block-videos')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="compressHTML"
          checked={settings.compressHTML}
          onCheckedChange={checked => handleChange(checked, 'compressHTML')}
          label={t('compress-HTML')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeAlternativeFonts"
          checked={settings.removeAlternativeFonts}
          onCheckedChange={checked => handleChange(checked, 'removeAlternativeFonts')}
          label={t('remove-alternative-fonts')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeAlternativeMedias"
          checked={settings.removeAlternativeMedias}
          onCheckedChange={checked => handleChange(checked, 'removeAlternativeMedias')}
          label={t('remove-alternative-medias')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeAlternativeImages"
          checked={settings.removeAlternativeImages}
          onCheckedChange={checked => handleChange(checked, 'removeAlternativeImages')}
          label={t('remove-alternative-images')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="groupDuplicateImages"
          checked={settings.groupDuplicateImages}
          onCheckedChange={checked => handleChange(checked, 'groupDuplicateImages')}
          label={t('group-duplicate-images')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="loadDeferredImages"
          checked={settings.loadDeferredImages ?? true}
          onCheckedChange={checked => handleChange(checked, 'loadDeferredImages')}
          label={t('load-deferred-images')}
        >
        </SettingCheckBox>
        <div className="space-y-2">
          <Label>{t('load-deferred-images-max-idle-time')}</Label>
          <Input
            type="number"
            value={settings.loadDeferredImagesMaxIdleTime ?? 1500}
            onChange={(e) => {
              const value = e.target.value
              setSettings((prev) => {
                const newSettings = {
                  ...prev,
                  loadDeferredImagesMaxIdleTime: Number.parseInt(value),
                }
                setSingleFileSetting(newSettings)
                return newSettings
              })
            }}
          />
        </div>
      </div>
    </div>
  )
}

interface SettingCheckBoxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  id: string
}

function SettingCheckBox({ checked, onCheckedChange, label, id }: SettingCheckBoxProps) {
  function handleChange(checked: boolean | string) {
    if (typeof checked === 'string') {
      return
    }
    onCheckedChange(checked)
  }

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={handleChange}
      >
      </Checkbox>
      <Label
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </Label>
    </div>
  )
}

export default SettingPage
