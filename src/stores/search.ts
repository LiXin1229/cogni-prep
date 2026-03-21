import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { FileNode } from '@/pages/Editor/type'
import request from '@/utils/request'
import API from '@/utils/API'

export interface MatchInfo {
  context: string
  index: number
  length: number
}

export interface SearchResult {
  fileNode: FileNode
  matches: MatchInfo[]
}

export type FileTreeSource = 'local' | 'online'

type Task<T> = {
  fn: () => Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}

class SuperTask<T = any> {
  poolSize: number
  taskQueue: Task<T>[] = []
  runningCount: number = 0

  constructor(poolSize: number) {
    this.poolSize = poolSize
  }

  add(task: Task<T>['fn']): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        fn: task,
        resolve,
        reject,
      })
      this.runTask()
    })
  }

  runTask() {
    while (this.runningCount < this.poolSize && this.taskQueue.length) {
      this.runningCount++
      const task = this.taskQueue.shift()!
      task
        .fn()
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.runningCount--
          this.runTask()
        })
    }
  }
}

const superTask = new SuperTask(5)

const TEXT_FILE_EXTENSIONS = ['.md', '.txt', '.markdown']

export const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(String(e.target?.result as string) || '')
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsText(file)
  })
}

const isTextFile = (fileName: string): boolean => {
  const ext = fileName.toLowerCase()
  return TEXT_FILE_EXTENSIONS.some((textExt) => ext.endsWith(textExt))
}

const collectAllFiles = (node: FileNode): FileNode[] => {
  const files: FileNode[] = []

  const traverse = (n: FileNode) => {
    if (n.isFile && n.file && isTextFile(n.name)) {
      files.push(n)
    } else {
      for (const child of n.children) {
        traverse(child)
      }
    }
  }

  traverse(node)
  return files
}

const extractMatchContext = (
  content: string,
  keyword: string,
  preContextLength = 5,
  postContextLength = 20
): MatchInfo[] => {
  const matches: MatchInfo[] = []
  const lowerContent = content.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  let index = 0

  while ((index = lowerContent.indexOf(lowerKeyword, index)) !== -1) {
    const start = Math.max(0, index - preContextLength)
    const end = Math.min(content.length, index + keyword.length + postContextLength)
    const context = content.slice(start, end)
    matches.push({
      context,
      index,
      length: keyword.length,
    })
    index += keyword.length
  }

  return matches
}

export const useSearchStore = defineStore('search', () => {
  const fileTree = ref<FileNode | null>(null)
  const onlineFileTree = ref<FileNode | null>(null)
  const fileTreeSource = ref<FileTreeSource>('local')
  const keyword = ref('')
  const results = ref<SearchResult[]>([])
  const isSearching = ref(false)
  const selectedFileFromSearch = ref<FileNode | null>(null)
  const selectedMatch = ref<{ fileNode: FileNode; matchIndex: number } | null>(null)

  const currentFileTree = computed(() =>
    fileTreeSource.value === 'online' ? onlineFileTree.value : fileTree.value
  )

  const setLocalFileTree = (tree: FileNode | null) => {
    fileTree.value = tree
    fileTreeSource.value = 'local'
  }

  const setOnlineFileTree = (tree: FileNode | null) => {
    onlineFileTree.value = tree
    fileTreeSource.value = 'online'
  }

  const searchFiles = async (
    searchKeyword: string,
    tree: FileNode,
    getContent: (fileNode: FileNode) => Promise<string | null>
  ) => {
    const files = collectAllFiles(tree)
    const lowerKeyword = searchKeyword.toLowerCase()

    const results = await Promise.all(
      files.map((fileNode) =>
        superTask.add(async () => {
          const fileNameMatch = fileNode.name.toLowerCase().includes(lowerKeyword)
          const searchResult: SearchResult = { fileNode, matches: [] }

          const content = await getContent(fileNode)
          if (content && content.toLowerCase().includes(lowerKeyword)) {
            searchResult.matches = extractMatchContext(content, searchKeyword)
          }

          return fileNameMatch || searchResult.matches.length > 0 ? searchResult : null
        })
      )
    )

    return results.filter((r): r is SearchResult => r !== null)
  }

  const searchLocalFiles = (searchKeyword: string, tree: FileNode) =>
    searchFiles(searchKeyword, tree, async (fileNode) => {
      try {
        return await readFileContent(fileNode.file!)
      } catch {
        return null
      }
    })

  const searchOnlineFiles = (searchKeyword: string, tree: FileNode) =>
    searchFiles(searchKeyword, tree, async (fileNode) => {
      try {
        const res = await request<{ content: string }>({
          url: API.getContentbyFilePath,
          method: 'GET',
          params: { filePath: fileNode.path },
        })
        return res.success ? res.data.content : null
      } catch {
        return null
      }
    })

  const search = async (searchKeyword: string) => {
    keyword.value = searchKeyword

    if (!searchKeyword.trim()) {
      results.value = []
      return
    }

    const tree = currentFileTree.value
    if (!tree) {
      results.value = []
      return
    }

    isSearching.value = true
    results.value = []

    try {
      if (fileTreeSource.value === 'online') {
        results.value = await searchOnlineFiles(searchKeyword, tree)
      } else {
        results.value = await searchLocalFiles(searchKeyword, tree)
      }
    } finally {
      isSearching.value = false
    }
  }

  watch([keyword, currentFileTree], ([newKeyword, newTree]) => {
    if (!newKeyword.trim() || !newTree) {
      results.value = []
      return
    }
    search(newKeyword)
  })

  const clearSearch = () => {
    keyword.value = ''
    results.value = []
  }

  const selectFileFromSearch = (fileNode: FileNode) => {
    selectedFileFromSearch.value = fileNode
  }

  const clearSelectedFile = () => {
    selectedFileFromSearch.value = null
  }

  const selectMatch = (fileNode: FileNode, matchIndex: number) => {
    selectedFileFromSearch.value = fileNode
    selectedMatch.value = { fileNode, matchIndex }
  }

  const clearSelectedMatch = () => {
    selectedMatch.value = null
  }

  return {
    fileTree,
    onlineFileTree,
    fileTreeSource,
    currentFileTree,
    keyword,
    results,
    isSearching,
    selectedFileFromSearch,
    selectedMatch,
    setLocalFileTree,
    setOnlineFileTree,
    search,
    clearSearch,
    selectFileFromSearch,
    clearSelectedFile,
    selectMatch,
    clearSelectedMatch,
  }
})
