import { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SearchMatchType, SearchResultItem } from '~/data/page'
import { LinkStatusDot } from '~/components/link-status'
import TagContext from '~/store/tag'
import { tagLabel } from '~/utils/tag'

// Server snippet windows are capped at 46 chars before / 92 chars after the
// match and returned raw — hitting a cap means the text was cut there, so the
// frontend adds the ellipsis.
const SNIPPET_BEFORE_MAX = 46
const SNIPPET_AFTER_MAX = 92

const MATCH_TYPE_LABEL_KEY: Record<SearchMatchType, string> = {
  title: 'match-type-title',
  content: 'match-type-content',
  tag: 'match-type-tag',
}

function extractHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return url
  }
}

function SnippetText({ item }: { item: SearchResultItem }) {
  if (item.matchType === 'content' && item.snippet) {
    const { before, match, after } = item.snippet
    // Empty match means the server could not re-locate the keyword and
    // `after` holds a plain excerpt of the page text instead.
    if (match === '')
      return <>{after}</>
    return (
      <>
        {before.length >= SNIPPET_BEFORE_MAX && '…'}
        {before}
        <mark className="rounded-[3px] bg-accent-soft px-[3px] font-bold text-primary">{match}</mark>
        {after}
        {after.length >= SNIPPET_AFTER_MAX && '…'}
      </>
    )
  }
  return <>{item.pageDesc}</>
}

interface SearchResultCardProps {
  item: SearchResultItem
  onClick?: () => void
}

function SearchResultCard({ item, onClick }: SearchResultCardProps) {
  const { t } = useTranslation()

  // The search API returns tag names only; the emoji icons live in tagCache.
  const { tagCache } = useContext(TagContext)
  const iconByName = useMemo(() => new Map((tagCache ?? []).map(tag => [tag.name, tag.icon])), [tagCache])

  const hasSnippet = (item.matchType === 'content' && item.snippet)
    || item.pageDesc.length > 0

  return (
    <article
      className="flex cursor-pointer flex-col gap-[9px] rounded-result border border-border bg-surface px-[18px] py-4 hover:border-border-strong hover:shadow-lift"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <LinkStatusDot status={item.linkStatus} size={6} />
        <span className="truncate font-mono text-[11.5px] text-faint">{extractHost(item.pageUrl)}</span>
        <span className="ml-1 shrink-0 rounded-full bg-accent-soft px-2 py-px font-mono text-[10.5px] text-primary">
          {t(MATCH_TYPE_LABEL_KEY[item.matchType])}
        </span>
      </div>
      <h4 className="text-base font-bold leading-[1.3]">{item.title}</h4>
      {hasSnippet && (
        <p className="text-[13px] leading-[1.65] text-muted-foreground">
          <SnippetText item={item} />
        </p>
      )}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map(tag => (
            <span
              key={tag}
              className="rounded-full bg-surface-2 px-2 py-[2px] font-mono text-[11px] text-muted-foreground"
            >
              {tagLabel({ name: tag, icon: iconByName.get(tag) })}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

export default SearchResultCard
