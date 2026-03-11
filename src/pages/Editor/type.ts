export interface FileNode {
  name: string
  path: string
  isFile: boolean
  isOpen?: boolean
  children: FileNode[]
  parent: FileNode | null
  depth: number
  file?: File
}
