<script setup lang="ts">
import { ref } from 'vue'
import type { FileNode } from './type'
import FileTree from './FileTree.vue'
import Editor from './Editor.vue'
import type { Editor as EditorType, KeyCharTypes } from '@/utils/render'
import type { Ime } from '@/utils/render'

defineProps<{
  isSidebarFolded: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleSidebar'): void
}>()

const fileTree = ref<FileNode | null>(null)

const selectDirectory = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length) {
    fileTree.value = buildFileTree(files)
    // console.log('🌳 文件树: ', fileTree.value)
  }
}

const buildFileTree = (files: File[]) => {
  const root: FileNode = {
    name: '目录',
    path: '',
    isFile: false,
    isOpen: true,
    children: [],
    depth: 0,
  }

  const pathMap = new Map<string, FileNode>()
  pathMap.set('', root)

  for (const file of files) {
    const parts = (file.webkitRelativePath || file.name).split('/')
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

type SourceInfo = {
  type: 'text' | 'img'
  isRevoked?: boolean
  content: string
}

const selectedFile = ref<FileNode | null>(null)
const originalSourceMap = ref<Map<FileNode, SourceInfo>>(new Map())
const sourceMap = ref<Map<FileNode, SourceInfo>>(new Map())
const currSource = ref<SourceInfo>({
  type: 'text',
  content: '',
})

const setCurrentFileSource = (fileNode: FileNode) => {
  const source = sourceMap.value.get(fileNode)
  if (source && source.type === 'text') {
    currSource.value = source
  } else if (source && source.type === 'img') {
    if (source.isRevoked) {
      source.content = URL.createObjectURL(fileNode.file as Blob)
    }
    currSource.value = source
  }
}

const handleFileClick = async (fileNode: FileNode) => {
  if (fileNode.isFile && fileNode.file) {
    updateFileSource()
    cleanupFileUrl()

    // console.log('点击文件: ', fileNode, fileContentMap.value)
    selectedFile.value = fileNode

    if (!sourceMap.value.has(fileNode)) {
      try {
        // console.log('file: ', fileNode.file)
        let source: SourceInfo
        if (fileNode.file.type.startsWith('image/')) {
          // 判断是否是图片文件
          const dataUrl = URL.createObjectURL(fileNode.file)
          source = {
            type: 'img',
            isRevoked: false,
            content: dataUrl,
          }
        } else {
          const content = await readFileContent(fileNode.file)
          source = {
            type: 'text',
            content: typeof content === 'string' ? content : '[二进制文件]',
          }
        }

        sourceMap.value.set(fileNode, source)
        originalSourceMap.value.set(fileNode, source)
      } catch (err) {
        console.log('读取文件失败: ', err)
      }
    }

    setCurrentFileSource(fileNode)
  }
}

// 将文件读取为 string
const readFileContent = (file: File): Promise<string | ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result || '')
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsText(file)
  })
}

const cleanupFileUrl = () => {
  if (selectedFile.value) {
    const prevSource = sourceMap.value.get(selectedFile.value)
    if (prevSource && prevSource.type === 'img') {
      prevSource.isRevoked = true
      URL.revokeObjectURL(prevSource.content)
    }
  }
}

export type EditorInstance = {
  md: { source: string; editor: EditorType; ime: Ime }
}

const editorRef = ref<EditorInstance>()
// const editorRef = ref<{ value: EditorInstance }>()
// const editorRef = ref<InstanceType<typeof Editor>>()
// const editorRef = ref<EditorInstance>()

// 同步文件内容
const updateFileSource = () => {
  // console.log(selectedFile.value)
  if (selectedFile.value && editorRef.value?.md.source) {
    const fs = sourceMap.value.get(selectedFile.value)
    console.log('fs: ', fs)
    if (fs) {
      fs.content = editorRef.value.md.source
      currSource.value = {
        type: 'text',
        content: editorRef.value.md.source,
      }
    }
    // sourceMap.value.set(selectedFile.value, editorRef.value.md.source)
  }
}

// 重置文件初始内容
const resetFileSource = () => {
  if (selectedFile.value && currSource.value.type === 'text') {
    const originalSource = originalSourceMap.value.get(selectedFile.value)
    if (editorRef.value && originalSource) {
      const md = editorRef.value.md
      md.editor.history.reset(originalSource.content)
    }
  }
}

// 下载 Markdown 文件
const downloadMarkdown = () => {
  if (selectedFile.value && editorRef.value?.md) {
    const content = editorRef.value.md.source
    const filename = selectedFile.value.name

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

const handleSetStyle = (type: KeyCharTypes) => {
  if (editorRef.value) {
    const md = editorRef.value.md
    md.editor.handleInsertKeyChars(type)
    md.ime.focusImeTextArea()
  }
}
</script>

<template>
  <div class="editor">
    <!-- 顶部区 -->
    <div class="top">
      <div class="top-left">
        <div v-show="isSidebarFolded" class="toggle-sidebar" @click="emit('toggleSidebar')">
          <img
            src="../../assets/svgs/hide-sidebar.svg"
            :style="{ transform: isSidebarFolded ? 'rotate(180deg)' : 'none' }"
            alt=""
            class="icon"
          />
        </div>

        <div class="select-file">
          <div class="select-file-btn">选择文件</div>
          <input
            type="file"
            webkitdirectory
            multiple
            class="select-file-input"
            @change="selectDirectory"
          />
        </div>
      </div>

      <div v-if="selectedFile" class="top-middle">
        <div @click="handleSetStyle('strong')">加粗</div>
        <div @click="handleSetStyle('emphasis')">斜体</div>
        <div @click="handleSetStyle('inlineCode')">行内代码</div>
        <div @click="handleSetStyle('blockCode')">代码块</div>
      </div>

      <div class="top-right">
        <!-- <button @click="resetFileSource">重置</button>
        <button @click="downloadMarkdown">下载</button> -->

        <el-button :disabled="!selectedFile" @click="resetFileSource">重置</el-button>
        <el-button :disabled="!selectedFile" @click="downloadMarkdown">下载</el-button>
      </div>
    </div>

    <div class="main-content">
      <FileTree
        :file-tree="fileTree"
        :selected-file="selectedFile"
        :handle-file-click="handleFileClick"
      />

      <div class="file-content">
        <template v-if="currSource.type === 'text'">
          <Editor ref="editorRef" :text="currSource.content" />
        </template>
        <div v-else class="image-wapper">
          <img :src="currSource.content" alt="image" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor {
  width: 100%;
  height: 100%;
  background-color: var(--primary-bgc);

  .top {
    width: 100%;
    height: 50px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    border-bottom: 1px solid var(--light-border-color-1);
    overflow-x: auto;
    overflow-y: hidden;

    .top-left {
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }

    .top-middle {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    ::-webkit-scrollbar {
      display: none;
    }

    .toggle-sidebar {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 24px;
      height: 24px;
      border-radius: 5px;
      margin-right: 15px;
      cursor: pointer;

      .icon {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background-color: var(--btn-hover);
      }
    }

    .select-file {
      position: relative;

      .select-file-btn {
        padding: 6px 12px;
        border-radius: 10px;
        font-weight: bold;
        font-size: 15px;
        position: relative;
        cursor: pointer;
        background-color: var(--theme-color-1);
        color: var(--normal-bgc);
      }

      .select-file-input {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        z-index: 1;
      }
    }
  }

  .main-content {
    display: flex;

    // 文件内容区
    .file-content {
      padding: 20px;
      overflow: auto;
      width: 100%;
      height: calc(100vh - 60px);

      .image-wapper {
        width: 100%;

        img {
          width: 50%;
          // height: 100%;
        }
      }
    }
  }
}
</style>
