export interface FavoriteItem {
  id: string           // case_id
  title: string
  desc: string
  tags: string[]
  score_total: number
  url?: string
  image?: string
  progress?: Record<string, boolean>  // 步骤完成状态
  steps_count?: number
  completed_count?: number
  addedAt: number      // timestamp
  lastModifiedAt: number
}

export interface CloudFavoriteItem {
  _id?: string
  resourceId: string
  resourceType?: string
  title?: string
  desc?: string
  url?: string
  image?: string
  tags?: string[]
  score_total?: number
  createdAt?: any
}