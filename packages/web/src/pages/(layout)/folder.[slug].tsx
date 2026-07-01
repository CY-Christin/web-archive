import { isNil } from '@web-archive/shared/utils'
import { useParams } from '~/router'
import NotFound from '~/components/not-found'
import LibraryView from '~/components/library-view'

// A folder is just the library scoped to one folderId — same browsing surface.
function FolderPage() {
  const { slug } = useParams('/folder/:slug')

  if (isNil(slug))
    return <NotFound />

  return <LibraryView key={slug} folderId={slug} />
}

export default FolderPage
