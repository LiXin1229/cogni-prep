export interface FileNode {
  name: string
  path: string
  isFile: boolean
  isOpen?: boolean
  children: FileNode[]
  depth: number
  file?: File
}
