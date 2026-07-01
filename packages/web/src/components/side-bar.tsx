import { HomeIcon, LogOut, Settings, SquareLibrary, Trash2 } from 'lucide-react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@web-archive/shared/components/side-bar'
import { useEffect, useState } from 'react'
import { isNumberString } from '@web-archive/shared/utils'
import { useLocation } from 'react-router-dom'
import { ThemeToggle } from '@web-archive/shared/components/theme-toggle'
import { useTranslation } from 'react-i18next'
import SettingDialog from './setting-dialog'
import SidebarFolderMenu from './side-bar-folder-menu'
import SidebarTagMenu from './side-bar-tag-menu'
import { Link, useNavigate, useParams } from '~/router'

interface SidebarProps {
  selectedTag: number | null
  setSelectedTag: (tag: number | null) => void
}

function Component({ selectedTag, setSelectedTag }: SidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [openedFolder, setOpenedFolder] = useState<number | null>(null)
  const { slug } = useParams('/folder/:slug')
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/folder/') && isNumberString(slug))
      setOpenedFolder(Number(slug))
    else
      setOpenedFolder(null)
  }, [slug, pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const [settingDialogOpen, setSettingDialogOpen] = useState(false)

  return (
    <Sidebar>
      <SettingDialog open={settingDialogOpen} setOpen={setSettingDialogOpen} />

      <SidebarHeader className="px-3 pb-1 pt-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <img src="/static/logo.svg" className="h-7 w-7 shrink-0 rounded-[7px]" alt="" />
          <span className="font-display text-lg font-semibold tracking-tight text-sidebar-foreground">
            Web Archive
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
        <SidebarGroup className="py-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/'}>
                <Link to="/">
                  <HomeIcon />
                  <span>{t('home')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarFolderMenu
          openedFolder={openedFolder}
          setOpenedFolder={setOpenedFolder}
        />
        <SidebarTagMenu
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          selectedFolder={openedFolder}
        />
      </SidebarContent>

      <SidebarFooter className="gap-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/showcase/folder">
                <SquareLibrary />
                <span>Showcase</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setSettingDialogOpen(true)}>
              <Settings />
              <span>{t('settings')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/trash">
                <Trash2 />
                <span>{t('trash')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => {
              setOpenedFolder(null)
              handleLogout()
            }}
            >
              <LogOut />
              <span>{t('logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="mt-1 flex items-center justify-end border-t border-sidebar-border px-1 pt-2">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export default Component
