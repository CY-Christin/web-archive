import { useSidebar } from '@web-archive/shared/components/side-bar'
import { cn } from '@web-archive/shared/utils'
import { SquareMenu } from 'lucide-react'

interface HamburgerProps {
  className?: string
  onClick?: () => void
}

function Hamburger({ className, onClick }: HamburgerProps) {
  const { openMobile, setOpenMobile } = useSidebar()
  return (
    <button
      type="button"
      aria-label="Toggle sidebar"
      className={cn(
        'flex cursor-pointer items-center rounded-r-lg bg-primary py-2 pl-2 pr-3 text-primary-foreground shadow-card transition-colors hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      onClick={() => {
        onClick?.()
        setOpenMobile(!openMobile)
      }}
    >
      <SquareMenu className="h-5 w-5" />
    </button>
  )
}

export default Hamburger
