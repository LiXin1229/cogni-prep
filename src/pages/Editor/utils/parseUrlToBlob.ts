import type { FileNode } from '../type'

export const parseUrlToBlob = (url: string, currNode: FileNode | null) => {
  // console.log('parseUrlToBlob: ', url) // ../../imgs/堆栈存储.png   ./pic.png
  url = url.replace(/\\/g, '/')
  let node: FileNode | null = currNode?.parent ?? null
  while (url.length && node) {
    if (url.startsWith('../')) {
      node = node.parent
      url = url.slice(3)
    } else if (url.startsWith('./')) {
      url = url.slice(2)
    } else {
      const endIndex = url.indexOf('/')
      if (endIndex > 0) {
        const name = url.slice(0, endIndex)
        node = node.children.find((c) => c.name === name) ?? null
        url = url.slice(endIndex + 1)
      } else {
        const name = url
        node = node.children.find((c) => c.name === name) ?? null
        url = ''
        if (node) {
          return URL.createObjectURL(node.file as Blob)
        }
      }
    }
    // console.log('url: ', url)
    // console.log('node: ', node)
  }
  return ''
}
