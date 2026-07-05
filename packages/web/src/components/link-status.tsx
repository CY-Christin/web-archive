import { useTranslation } from 'react-i18next'
import { cn } from '@web-archive/shared/utils'
import type { LinkStatus, Page } from '@web-archive/shared/types'

export type { LinkStatus }

interface LinkStatusMeta {
  /** Dot color (also used as generic status color). */
  dot: string
  /** Pill background. */
  pillBg: string
  /** Pill text color. */
  pillFg: string
  /** i18n key for the label (有效 / 已失效 / 已跳转). */
  labelKey: string
}

// Exact values from the design mock's status meta. Colors reference theme
// tokens where one exists; the two translucent pill backgrounds and the
// redirect fg have no token and are intentionally literal.
export const LINK_STATUS_META: Record<LinkStatus, LinkStatusMeta> = {
  live: {
    dot: 'var(--success)',
    pillBg: 'rgba(31,138,91,.13)',
    pillFg: 'var(--success)',
    labelKey: 'link-status-live',
  },
  dead: {
    dot: 'var(--danger)',
    pillBg: 'var(--danger-soft)',
    pillFg: 'var(--danger)',
    labelKey: 'link-status-dead',
  },
  redirect: {
    dot: 'var(--chart-3)',
    pillBg: 'rgba(217,147,43,.15)',
    pillFg: '#c07d17',
    labelKey: 'link-status-redirect',
  },
  unknown: {
    dot: 'var(--text-faint)',
    pillBg: 'rgba(154,158,166,.16)',
    pillFg: 'hsl(var(--muted-foreground))',
    labelKey: 'link-status-unknown',
  },
}

// Label key including the reason sub-classification: an 'unknown' probed as a
// Cloudflare block gets its own variant ("未知 · CF 拦截"). Use this wherever a
// status label is rendered next to a dot/pill.
export function linkStatusLabelKey(status: LinkStatus, reason?: Page['linkStatusReason']) {
  if (status === 'unknown' && reason === 'cf-blocked')
    return 'link-status-unknown-cf'
  return LINK_STATUS_META[status].labelKey
}

interface LinkStatusDotProps {
  status?: LinkStatus | null
  /** Diameter in px (mock uses 6 in card bars / search results, 7 elsewhere). */
  size?: number
  className?: string
}

function LinkStatusDot({ status, size = 6, className }: LinkStatusDotProps) {
  if (!status)
    return null
  const meta = LINK_STATUS_META[status]
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 rounded-full', className)}
      style={{ width: size, height: size, background: meta.dot }}
    />
  )
}

interface LinkStatusPillProps {
  status?: LinkStatus | null
  /** Sub-classification of 'unknown' (page.linkStatusReason); switches the label. */
  reason?: Page['linkStatusReason']
  className?: string
}

function LinkStatusPill({ status, reason, className }: LinkStatusPillProps) {
  const { t } = useTranslation()
  if (!status)
    return null
  const meta = LINK_STATUS_META[status]
  return (
    <span
      className={cn('shrink-0 rounded-full px-[9px] py-[2px] font-mono text-[10.5px]', className)}
      style={{ background: meta.pillBg, color: meta.pillFg }}
    >
      {t(linkStatusLabelKey(status, reason))}
    </span>
  )
}

export { LinkStatusDot, LinkStatusPill }
