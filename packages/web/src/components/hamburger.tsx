import { useSidebar } from '@web-archive/shared/components/side-bar'
import { SquareMenu } from 'lucide-react'

interface HamburgerProps {
  className?: string
  onClick?: () => void
}

function Hamburger({ className, onClick }: HamburgerProps) {
  const { openMobile, setOpenMobile } = useSidebar()
  return (
    <div className={`text-primary-foreground bg-primary hover:bg-primary/90 active:bg-primary/80 cursor-pointer transition-colors shadow-card py-2 pr-3 pl-1 rounded-r-[50%] ${className}`} onClick={() => setOpenMobile(!openMobile)}>
      <SquareMenu className="h-5 w-5" />
    </div>
  )
}

export default Hamburger
