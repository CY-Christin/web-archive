import type { Tag } from '@web-archive/shared/types'

// A tag's leading mark: its emoji icon if set, otherwise a small colour dot
// (falling back to a muted dot when no meaningful colour was chosen).
function TagIcon({ tag, className }: { tag: Pick<Tag, 'icon' | 'color'>, className?: string }) {
  if (tag.icon)
    return <span className={`text-xs leading-none ${className ?? ''}`}>{tag.icon}</span>

  const hasColor = tag.color && tag.color.toLowerCase() !== '#ffffff'
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${hasColor ? '' : 'bg-muted-foreground/40'} ${className ?? ''}`}
      style={hasColor ? { backgroundColor: tag.color } : undefined}
    />
  )
}

export default TagIcon
