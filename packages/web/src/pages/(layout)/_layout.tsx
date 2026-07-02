import { Toaster } from 'react-hot-toast'
import { Outlet } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useLocalStorageState, useRequest } from 'ahooks'
import AppSidebar from '~/components/app-sidebar'
import AppTopbar from '~/components/app-topbar'
import CommandPalette from '~/components/command-palette'
import { useMediaQuery } from '~/hooks/useMediaQuery'
import { getAllTag } from '~/data/tag'
import TagContext from '~/store/tag'
import { toastOptions } from '~/utils/toast'

function Layout() {
  const {
    data: tagCache,
    loading: tagLoading,
    runAsync: refreshTagCache,
  } = useRequest(getAllTag)

  const isMobile = useMediaQuery('(max-width: 859px)')
  const [collapsed, setCollapsed] = useLocalStorageState('sidebar-collapsed', { defaultValue: false })
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => {
    if (!isMobile)
      setDrawerOpen(false)
  }, [isMobile])

  return (
    <TagContext.Provider value={
      useMemo(() => ({
        tagCache: tagCache || [],
        // Only the initial load counts; refreshes keep showing the old cache.
        tagCacheLoading: tagLoading && !tagCache,
        refreshTagCache,
      }), [tagCache, tagLoading, refreshTagCache])
    }
    >
      <div className="flex min-h-screen bg-background">
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={toastOptions}
        />
        <CommandPalette />
        <AppSidebar
          isMobile={isMobile}
          collapsed={collapsed ?? false}
          onToggleCollapse={() => setCollapsed(prev => !prev)}
          drawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
        />
        <div className="flex h-screen min-w-0 flex-1 flex-col">
          <AppTopbar
            isMobile={isMobile}
            onOpenDrawer={() => setDrawerOpen(true)}
          />
          {/* id="main-scroll" is the scroll container pages target for infinite scroll */}
          <main id="main-scroll" className="flex-1 overflow-y-auto p-4 desk:p-7">
            <Outlet />
          </main>
        </div>
      </div>
    </TagContext.Provider>
  )
}

export default Layout
