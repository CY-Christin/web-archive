import { DialogClose, DialogDescription, DialogTitle } from '@radix-ui/react-dialog'
import { Dialog, DialogContent, DialogFooter } from '@web-archive/shared/components/dialog'
import { Input } from '@web-archive/shared/components/input'
import { Switch } from '@web-archive/shared/components/switch'
import { useRequest } from 'ahooks'
import { useForm } from 'react-hook-form'
import { memo, useContext, useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@web-archive/shared/components/form'
import { z } from 'zod'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web-archive/shared/components/select'
import { Textarea } from '@web-archive/shared/components/textarea'
import { Button } from '@web-archive/shared/components/button'
import { toast } from 'react-hot-toast'
import type { AutoCompleteTagInputRef } from '@web-archive/shared/components/auto-complete-tag-input'
import AutoCompleteTagInput from '@web-archive/shared/components/auto-complete-tag-input'
import { useTranslation } from 'react-i18next'
import LoadingWrapper from '~/components/loading-wrapper'
import { getPageDetail, updatePage } from '~/data/page'
import { getAllFolder } from '~/data/folder'
import { getAITagConfig } from '~/data/config'
import { generateTag } from '~/data/tag'
import TagContext from '~/store/tag'

interface CardEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pageId: number
}

function Comp({ open, onOpenChange, pageId }: CardEditDialogProps) {
  const { t } = useTranslation()

  const { data: folders, loading: foldersLoading, run: getAllFolderRun } = useRequest(getAllFolder, {
    manual: true,
  })

  const formSchema = z.object({
    title: z.string().min(1, { message: t('title-is-required') }),
    pageDesc: z.string().min(1, { message: t('description-is-required') }),
    pageUrl: z.string().min(1, { message: t('page-url-is-required') }),
    isShowcased: z.number(),
    folderId: z.number(),
    unbindTags: z.array(z.string()),
    bindTags: z.array(z.string()),
  })
  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      title: '',
      pageDesc: '',
      pageUrl: '',
      isShowcased: 0,
      folderId: 0,
      unbindTags: [],
      bindTags: [],
    },
  })
  const { loading, run: getPageDetailRun } = useRequest(
    getPageDetail,
    {
      manual: true,
      onSuccess: (data) => {
        // reset replaces values wholesale: omitting the tag arrays would leave
        // bindTags/unbindTags undefined and crash the submit handler.
        form.reset({
          title: data.title,
          pageDesc: data.pageDesc,
          pageUrl: data.pageUrl,
          isShowcased: data.isShowcased,
          folderId: data.folderId,
          bindTags: [],
          unbindTags: [],
        })
      },
    },
  )

  const { tagCache, refreshTagCache } = useContext(TagContext)
  const selectTags = tagCache?.filter(tag => tag.pageIds.includes(pageId))
  const handleTagChange = ({
    bindTags,
    unbindTags,
  }: {
    bindTags: string[]
    unbindTags: string[]
  }) => {
    form.setValue('bindTags', bindTags)
    form.setValue('unbindTags', unbindTags)
  }

  // AI tag generation: results are staged into the tag input (the user can
  // still remove them); only the ones still selected on save are bound, with
  // their emoji icon, via bindTagsWithIcon.
  const { data: aiConfig, run: getAIConfigRun } = useRequest(getAITagConfig, {
    manual: true,
  })
  const aiAvailable = aiConfig != null && aiConfig.enabled !== false && aiConfig.model !== ''
  const tagInputRef = useRef<AutoCompleteTagInputRef>(null)
  const [aiTags, setAiTags] = useState<Array<{ name: string, icon: string }>>([])
  const [generatingTags, setGeneratingTags] = useState(false)

  const handleGenerateTags = async () => {
    if (generatingTags)
      return
    if (!aiConfig || !aiAvailable) {
      toast.error(t('ai-tag-not-configured'))
      return
    }
    setGeneratingTags(true)
    try {
      const generated = await generateTag({
        ...aiConfig,
        withIcon: true,
        title: form.getValues('title'),
        pageDesc: form.getValues('pageDesc'),
        // Same semantics as the plugin: existing tag names steer the model.
        preferredTags: tagCache?.map(tag => tag.name) ?? [],
      })
      setAiTags(prev => [...prev, ...generated.filter(tag => !prev.some(item => item.name === tag.name))])
      tagInputRef.current?.addTags(generated.map(tag => tag.name))
    }
    catch {
      // fetcher already toasted the server error.
    }
    finally {
      setGeneratingTags(false)
    }
  }

  useEffect(() => {
    if (open) {
      getPageDetailRun(pageId.toString())
      getAllFolderRun()
      getAIConfigRun()
      setAiTags([])
    }
  }, [open])
  const { run: updatePageRun } = useRequest(updatePage, {
    manual: true,
    onSuccess: () => {
      toast.success(t('page-update-success'))
      refreshTagCache()
      // List re-sync happens in the PageCard owner via onEdited when the dialog closes.
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Title/description must live inside DialogContent: outside it they
          render as always-present empty h2/p siblings of the card, each
          stealing a cell in CardView's grid. */}
      <DialogContent className="shadow-elevated">
        <DialogTitle className="sr-only">{t('edit-page')}</DialogTitle>
        <DialogDescription className="sr-only">{t('edit-page')}</DialogDescription>
        <LoadingWrapper loading={loading || foldersLoading}>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((data) => {
                // AI-staged tags still selected go through bindTagsWithIcon
                // (so their emoji is stored); they must not repeat in bindTags.
                const aiSelected = aiTags.filter(tag => data.bindTags.includes(tag.name))
                updatePageRun({
                  ...data,
                  bindTags: data.bindTags.filter(name => !aiSelected.some(tag => tag.name === name)),
                  bindTagsWithIcon: aiSelected,
                  isShowcased: Number(data.isShowcased),
                  id: pageId,
                })
              })}
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('title')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('input-title-placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pageDesc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('description')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('input-description-placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('page-url')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('input-page-url-placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isShowcased"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-2">
                    <FormLabel>{t('showcased')}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value === 1} onCheckedChange={value => field.onChange(Number(value))} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="folderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('folder')}</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={String(field.value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('select-a-folder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {folders?.map(folder => (
                            <SelectItem key={folder.id} value={String(folder.id)}>{folder.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="tags"
                render={() => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t('tags')}</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={!aiAvailable ? 'opacity-60' : undefined}
                        disabled={generatingTags}
                        title={aiAvailable ? undefined : t('ai-tag-not-configured')}
                        onClick={handleGenerateTags}
                      >
                        {generatingTags
                          ? <Loader2 size={14} className="mr-1.5 animate-spin" />
                          : <Sparkles size={14} className="mr-1.5" />}
                        {t(generatingTags ? 'ai-generating-tags' : 'ai-generate-tags')}
                      </Button>
                    </div>
                    <FormControl>
                      <AutoCompleteTagInput
                        ref={tagInputRef}
                        tags={tagCache ?? []}
                        selectTags={selectTags ?? []}
                        onChange={handleTagChange}
                      >
                      </AutoCompleteTagInput>
                    </FormControl>
                  </FormItem>
                )}
              >
              </FormField>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t('cancel')}</Button>
                </DialogClose>
                <Button type="submit">{t('save')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </LoadingWrapper>
      </DialogContent>
    </Dialog>
  )
}

const CardEditDialog = memo(Comp)

export default CardEditDialog
