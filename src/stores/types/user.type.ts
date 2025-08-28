export interface UserInfoType {
  userId?: number
  username?: string
}

export interface AreaType {
  areaId: number
  name: string
}

export interface AreaListType {
  areaList: AreaType[]
}
