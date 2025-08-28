export interface SessionType {
  areaId: number
  sessionId: number
  title: string
  mainArea: string
  surroundingPoint: string
  prefer: number
  createdTime: string
  updatedTime: string
}

export interface MainAreaType {
  areaId?: number | null
  name?: string
}
