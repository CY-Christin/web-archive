import { memo } from 'react'
import { GithubIcon } from './github'

function Comp() {
  return (
    <a href="https://github.com/ray-d-song/web-archive" target="_blank" rel="noreferrer" className="m-2 flex items-center justify-end gap-2 self-end rounded-lg border border-border bg-card px-3 py-2 text-foreground shadow-card transition-colors hover:bg-accent">
      <div className="flex flex-col leading-tight">
        <span className="text-xs text-muted-foreground">powered by</span>
        <span className="font-display text-base font-semibold">
          Web Archive
        </span>
      </div>
      <GithubIcon className="inline-block h-7 w-7" />
    </a>
  )
}

const PoweredBy = memo(Comp)

export default PoweredBy
