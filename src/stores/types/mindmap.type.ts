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

export interface AIAddFormDataType {
  number: number
  auto: boolean
}

export interface PointListType {
  name: string
  frequency: number
  width: string
}

export interface CallbackMap {
  addNodes: (data: { name: string, frequency: number }[]) => void
  editNode: (data: { name: string, rating: number }) => void
  deleteNode: () => void
  deleteChildren: () => void
  renderChart: () => void
  reloadChart: () => void
}
