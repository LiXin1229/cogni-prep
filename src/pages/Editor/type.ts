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

export const buildFileTree = (
  files: File[],
  referenceParent = true,
  ignoreDirs: Set<string> = new Set(['node_modules', '.git', '.vscode'])
) => {
  const root: FileNode = {
    name: '目录',
    path: '',
    isFile: false,
    isOpen: true,
    children: [],
    parent: null,
    depth: 0,
  }

  const pathMap = new Map<string, FileNode>()
  pathMap.set('', root)

  for (const file of files) {
    const parts = (file.webkitRelativePath || file.name).split('/')
    if (parts.some((part) => ignoreDirs.has(part))) {
      continue // 跳过该文件
    }

    let currentPath = ''
    let parentNode = root

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (!pathMap.has(currentPath)) {
        const node: FileNode = {
          name: part,
          path: currentPath,
          isFile: false,
          isOpen: true,
          children: [],
          parent: referenceParent ? parentNode : null,
          depth: i + 1,
        }
        pathMap.set(currentPath, node)
        parentNode.children.push(node)
      }

      parentNode = pathMap.get(currentPath)!
    }

    const fileName = parts[parts.length - 1]
    const filePath = parts.join('/')

    parentNode.children.push({
      name: fileName,
      path: filePath,
      isFile: true,
      file: file,
      depth: parts.length,
      parent: referenceParent ? parentNode : null,
      children: [],
    })
  }

  const sortNodeChildren = (node: FileNode) => {
    if (!node.children || node.children.length === 0) return

    // 先递归排序子节点的子节点 (深度优先)
    node.children.forEach((child) => {
      if (!child.isFile) {
        sortNodeChildren(child)
      }
    })

    // 再对当前层的 children 进行排序
    node.children.sort((a, b) => {
      // 文件夹优先于文件
      if (a.isFile !== b.isFile) {
        return a.isFile ? 1 : -1
      }

      // 同类型下，按名称自然排序 (localeCompare 支持数字智能排序)
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    })
  }

  sortNodeChildren(root)

  return root
}
