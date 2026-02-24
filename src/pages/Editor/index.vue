<script setup lang="ts">
import { ref } from 'vue'
import type { FileNode } from './type'
import FileTree from './FileTree.vue'
import Editor from './Editor.vue'

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
    // console.log('files: ', files)
    fileTree.value = buildFileTree(files)
    console.log('🌳 文件树: ', fileTree.value)
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

const selectedFile = ref<FileNode | null>(null)
const fileContent = ref<string>('')

const handleFileClick = async (fileNode: FileNode) => {
  if (fileNode.isFile && fileNode.file) {
    console.log('点击文件: ', fileNode)
    selectedFile.value = fileNode

    try {
      const content = await readFileContent(fileNode.file)
      fileContent.value = typeof content === 'string' ? content : '[二进制文件]'
    } catch (err) {
      console.log('读取文件失败: ', err)
    }
  }
}

const readFileContent = (file: File): Promise<string | ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result || '')
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsText(file)
  })
}
</script>

<template>
  <div class="editor">
    <!-- 顶部区 -->
    <div class="top">
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

    <div class="main-content">
      <FileTree
        :file-tree="fileTree"
        :selected-file="selectedFile"
        :handle-file-click="handleFileClick"
      />

      <div class="file-content">
        <Editor :file-content="fileContent" />
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
    align-items: center;
    padding: 0 20px;
    border-bottom: 1px solid var(--light-border-color-1);
    overflow-x: auto;
    overflow-y: hidden;

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
    }
  }
}
</style>
