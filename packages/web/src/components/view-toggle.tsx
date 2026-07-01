import { Button } from '@web-archive/shared/components/button'
import { Grid2X2, List } from 'lucide-react'
import { useContext } from 'react'
import AppContext from '../store/app'

function ViewToggle() {
  const { view, setView } = useContext(AppContext)

  const segmentClass = (active: boolean) =>
    `h-8 w-8 rounded-md transition-colors ${
      active
        ? 'bg-card text-foreground shadow-card hover:bg-card'
        : 'bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground'
    }`

  return (
    <>
      <div className="hidden items-center gap-1 rounded-lg border border-border bg-muted p-1 lg:flex">
        <Button variant="ghost" size="icon" className={segmentClass(view === 'card')} onClick={() => setView('card')}>
          <Grid2X2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className={segmentClass(view === 'list')} onClick={() => setView('list')}>
          <List className="h-4 w-4" />
        </Button>
      </div>
      <div className="block lg:hidden">
        <Button variant="outline" size="icon" onClick={() => setView(view === 'card' ? 'list' : 'card')}>
          {view === 'card' ? <List className="h-4 w-4" /> : <Grid2X2 className="h-4 w-4" />}
        </Button>
      </div>
    </>
  )
}

export default ViewToggle
