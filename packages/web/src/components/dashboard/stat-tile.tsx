import type { ReactNode } from 'react'
import { Skeleton } from '@web-archive/shared/components/skeleton'

interface StatTileProps {
  icon: ReactNode
  label: string
  value: ReactNode
  sub?: ReactNode
  loading?: boolean
}

function StatTile({ icon, label, value, sub, loading = false }: StatTileProps) {
  return (
    <div className="rounded-card border border-border bg-surface px-5 py-[18px]">
      <div className="mb-3.5 flex items-center gap-[9px] text-muted-foreground">
        <span className="shrink-0">{icon}</span>
        <span className="text-[13px] font-semibold">{label}</span>
      </div>
      {loading
        ? (
            <>
              <Skeleton className="h-[38px] w-24" />
              <Skeleton className="mt-1.5 h-4 w-32" />
            </>
          )
        : (
            <>
              <div className="font-mono text-[30px] font-semibold tracking-[-0.02em] text-foreground">{value}</div>
              {sub != null && <div className="mt-1.5 text-xs text-faint">{sub}</div>}
            </>
          )}
    </div>
  )
}

export default StatTile
