export interface TreeNode {
  id: string
  name: string
  children: TreeNode[]
  isRoot?: boolean
  frequency: number
  isFolded: number
  chatId: number | null
  markId: number | null
}

export interface PartialNode {
  markId: number | null
  id: string
}

export interface KeyNodeType {
  areaId: number | null
  markId: number | null
  nodeId: string
}

export type SendStateType = 'available' | 'loading' | 'streaming'

export interface StreamRequestConfigType {
  mainArea: string,
  point: string
}

export interface CallbackMap {
  insertText: (text: string, position: number) => void
  reLoadNote: () => void
}
