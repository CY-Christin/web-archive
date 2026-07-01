import { Label } from '@radix-ui/react-context-menu'
import { DialogDescription } from '@radix-ui/react-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@web-archive/shared/components/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web-archive/shared/components/select'
import { Switch } from '@web-archive/shared/components/switch'
import { useTheme } from '@web-archive/shared/components/theme-provider'
import { Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageCombobox from '@web-archive/shared/components/language-combobox'
import AITagSettingCollapsible from './ai-tag-setting-collapsible'
import { useShouldShowRecent } from '~/hooks/useShouldShowRecent'

function SettingDialog({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { shouldShowRecent, updateShouldShowRecent } = useShouldShowRecent()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="shadow-elevated">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            {t('settings')}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
        </DialogDescription>
        <div className="space-y-6">
          <div className="rounded-lg border border-border divide-y divide-border bg-card">
            <div className="flex items-center justify-between gap-4 p-4">
              <Label className="text-sm font-medium text-foreground">
                {t('color-theme')}
              </Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t('light')}</SelectItem>
                  <SelectItem value="dark">{t('dark')}</SelectItem>
                  <SelectItem value="system">{t('system')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4 p-4">
              <Label className="text-sm font-medium text-foreground">
                {t('language-web')}
              </Label>
              <div className="w-40">
                <LanguageCombobox></LanguageCombobox>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 p-4">
              <Label className="text-sm font-medium text-foreground">
                {t('show-recent-save-page')}
              </Label>
              <Switch
                checked={shouldShowRecent}
                onCheckedChange={updateShouldShowRecent}
              >
              </Switch>
            </div>
          </div>
          <div>
            <AITagSettingCollapsible></AITagSettingCollapsible>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SettingDialog
