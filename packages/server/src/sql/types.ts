type Tag = {
  id: number
  name: string
  pageIdDict: string
  createdAt: Date
  updatedAt: Date
}

export type { Page, Folder, LinkStatus } from '@web-archive/shared/types/model'
export type { Tag }
