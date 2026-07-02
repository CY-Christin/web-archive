import { isNil } from '@web-archive/shared/utils'
import { useParams } from '~/router'
import NotFound from '~/components/not-found'
import ArchiveView from '~/components/archive-view'

// A folder is just the archive scoped to one folderId — same browsing surface.
function FolderPage() {
  const { slug } = useParams('/folder/:slug')

  if (isNil(slug) || Number.isNaN(Number(slug)))
    return <NotFound />

  return <ArchiveView key={slug} folderId={Number(slug)} />
}

export default FolderPage
