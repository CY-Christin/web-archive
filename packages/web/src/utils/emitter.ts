import mitt from 'mitt'

type Events = {
  movePage: { pageId: number, folderId: number }
  /** Refetch sidebar folder list (emit after folder create/update/delete). */
  refreshSideBar: void
  /** Open the global ⌘K command palette (topbar badge / mobile magnifier emit this). */
  openCommandPalette: void
}

export default mitt<Events>()
