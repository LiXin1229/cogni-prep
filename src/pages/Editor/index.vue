<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { buildFileTree, type FileNode } from './type'
import FileTree from './FileTree.vue'
import Editor from './Editor.vue'
import Directory from './Directory.vue'
import FloatingToolbar from './FloatingToolbar.vue'
import type { Editor as EditorType, KeyCharTypes } from '@/utils/render'

import { useUserInfoStore } from '@/stores/user'
import { readFileContent, useSearchStore } from '@/stores/search'
import request from '@/utils/request'
import API from '@/utils/API'
import { ElMessageBox } from 'element-plus'

const userStore = useUserInfoStore()
const searchStore = useSearchStore()

defineProps<{
  isSidebarFolded: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleSidebar'): void
}>()

const fileTree = ref<FileNode | null>(null)

// 选择本地目录
watch(fileTree, (newTree) => {
  if (!readonlyMode.value) {
    searchStore.setLocalFileTree(newTree)
  }
})

watch(
  () => searchStore.selectedFileFromSearch,
  (fileNode) => {
    if (fileNode) {
      if (!readonlyMode.value) {
        handleFileClick(fileNode)
      } else {
        handleFileClickReadonly(fileNode)
      }
      searchStore.clearSelectedFile()
    }
  }
)

watch(
  () => searchStore.selectedMatch,
  async (match) => {
    if (match) {
      if (!readonlyMode.value) {
        handleFileClick(match.fileNode)
      } else {
        handleFileClickReadonly(match.fileNode)
      }
      // 等待文件加载完成后执行查找
      setTimeout(() => {
        const keyword = searchStore.keyword
        if (keyword) {
          highlightAndScroll(keyword, match.matchIndex)
        }
        searchStore.clearSelectedMatch()
      }, 100)
    }
  }
)

const highlightAndScroll = (keyword: string, targetMatchIndex: number) => {
  const editorEl = document.querySelector('.edit-container') as HTMLElement
  if (!editorEl) return

  // 使用 TreeWalker 查找文本节点
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT, null)

  let node
  let currentMatchIndex = 0
  while ((node = walker.nextNode())) {
    const text = node.textContent || ''
    const lowerText = text.toLowerCase()
    const lowerKeyword = keyword.toLowerCase()
    let searchIndex = 0

    while ((searchIndex = lowerText.indexOf(lowerKeyword, searchIndex)) !== -1) {
      if (currentMatchIndex === targetMatchIndex) {
        // 找到目标匹配，创建 Range
        const range = document.createRange()
        range.setStart(node, searchIndex)
        range.setEnd(node, searchIndex + keyword.length)

        // 滚动到位置
        const rect = range.getBoundingClientRect()
        const container = editorEl.closest('.file-content') as HTMLElement
        if (container) {
          const containerRect = container.getBoundingClientRect()
          const scrollTop =
            container.scrollTop + rect.top - containerRect.top - containerRect.height / 2
          container.scrollTo({ top: scrollTop, behavior: 'smooth' })
        }

        // 高亮（使用 Selection API）
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        return
      }
      currentMatchIndex++
      searchIndex += keyword.length
    }
  }
}

const selectDirectory = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length) {
    target.value = ''
    fileTree.value = buildFileTree(files, '本地目录')
    // console.log('🌳 文件树: ', fileTree.value)
  }
  setEditMode()
}

export type SourceInfo = {
  type: 'text' | 'img'
  content: string
}

const selectedFile = ref<FileNode | null>(null)
const originalSourceMap = ref<Map<FileNode, string>>(new Map())
const sourceMap = ref<Map<FileNode, SourceInfo>>(new Map())
const currSource = computed<SourceInfo | null>(() =>
  selectedFile.value ? (sourceMap.value.get(selectedFile.value) ?? null) : null
)

const handleFileClick = async (fileNode: FileNode) => {
  if (fileNode.isFile && fileNode.file) {
    if (currSource.value?.type === 'text') {
      // 跳转到其他文件时同步当前文本类型文件到 sourceMap
      updateTextFileSource()
    }

    if (currSource.value?.type === 'img') {
      cleanupFileUrl()
    }

    onCleanup()

    // console.log('点击文件: ', fileNode)
    selectedFile.value = fileNode

    if (!sourceMap.value.has(fileNode)) {
      try {
        let source: SourceInfo
        if (fileNode.file.type.startsWith('image/')) {
          // 判断是否是图片文件
          const dataUrl = URL.createObjectURL(fileNode.file)
          source = {
            type: 'img',
            content: dataUrl,
          }
        } else {
          const content = await readFileContent(fileNode.file)
          const text = typeof content === 'string' ? content : '[二进制文件]'
          source = {
            type: 'text',
            content: text,
          }
          originalSourceMap.value.set(fileNode, text)
        }

        sourceMap.value.set(fileNode, source)
      } catch (err) {
        console.log('读取文件失败: ', err)
      }
    }
  }
}

type EditorInstance = {
  md: { source: string; editor: EditorType; cleanup: () => void } | undefined
}
const editorRef = ref<EditorInstance>()

// 同步文件内容
const updateTextFileSource = () => {
  if (selectedFile.value && editorRef.value?.md?.source) {
    const fs = sourceMap.value.get(selectedFile.value)
    if (fs) fs.content = editorRef.value.md.source
  }
}

// 清理文件 URL
const cleanupFileUrl = () => {
  if (selectedFile.value) {
    const prevSource = sourceMap.value.get(selectedFile.value)
    if (prevSource && prevSource.type === 'img') {
      URL.revokeObjectURL(prevSource.content)
      sourceMap.value.delete(selectedFile.value)
    }
  }
}

// 重置文件初始内容
const resetFileSource = () => {
  if (selectedFile.value) {
    const originalText = originalSourceMap.value.get(selectedFile.value)
    if (originalText && editorRef.value) {
      const md = editorRef.value.md
      md?.editor.history.reset(originalText)
    }
  }
}

// 下载文件
const downloadFile = () => {
  const fileNode = selectedFile.value
  if (fileNode && fileNode.file && currSource.value) {
    let blob: Blob
    if (currSource.value.type === 'text') {
      const content = editorRef.value?.md?.source ?? ''
      const type = fileNode.file.type || 'text/markdown'
      blob = new Blob([content], { type })
    } else if (currSource.value.type === 'img') {
      blob = fileNode.file
    } else {
      blob = fileNode.file
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileNode.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

const handleSetStyle = (type: KeyCharTypes) => {
  if (editorRef.value) {
    const md = editorRef.value.md
    md?.editor.handleInsertKeyChars(type)
  }
}

// 编辑器的清理周期
const onCleanup = () => {
  if (editorRef.value) {
    const md = editorRef.value.md
    md?.cleanup()
  }
}

const directoryRef = ref<{ getDirectory?: () => void }>()

// 上传目录
const uploadDirectory = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length) {
    // console.log('📁 上传的文件: ', files)
    target.value = ''

    try {
      const promptResult = await ElMessageBox.prompt('', '设置文件夹名称', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^.{1,20}$/, // 至少1个字符，最多20个字符（包括中文、字母、数字、符号等）
        inputErrorMessage: '名称长度必须为1-20个字符',
      })
      console.log('用户输入的文件夹名称:', promptResult)
      const name = promptResult.value
      const tree = buildFileTree(files, name, false)
      try {
        const userId = userStore.userInfo.userId
        if (userId === undefined) {
          throw new Error('用户未登录')
        }

        const res = await request({
          url: API.fileTree,
          method: 'POST',
          data: {
            fileTree: tree,
            userId: userId,
            name: name,
          },
        })
        if (res.success) {
          // console.log('上传成功:', res.data)
          // fileTree.value = tree
          directoryRef.value?.getDirectory?.()
        }
      } catch (error) {
        console.log('上传失败:', error)
      }

      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file, file.webkitRelativePath || file.name)
        formData.append('path', file.webkitRelativePath)
      })

      try {
        const res = await request({
          url: API.uploadFile,
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        console.log('上传成功:', res.data)
      } catch (error) {
        console.log('上传失败:', error)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      /* empty */
    }
  }
}

// 只读模式
const readonlyMode = ref<boolean>(false)

const setReadonlyMode = (tree: FileNode) => {
  if (userStore.isMobile) {
    showMenu.value = true
  }
  readonlyMode.value = true
  fileTree.value = tree
  selectedFile.value = null
}

const setEditMode = () => {
  readonlyMode.value = false
  selectedFile.value = null
}

const handleFileClickReadonly = async (fileNode: FileNode) => {
  if (userStore.isMobile) {
    showMenu.value = false
  }

  // console.log('点击了:', fileNode.name)
  try {
    const res = await request<{ content: string }>({
      url: API.getContentbyFilePath,
      method: 'GET',
      params: {
        filePath: fileNode.path,
      },
    })
    if (res.success) {
      selectedFile.value = fileNode
      const content = res.data.content
      sourceMap.value.set(fileNode, {
        type: 'text',
        content: content,
      })
    }
  } catch (error) {
    console.log('fileNode: ', error)
  }
}

const showMenu = ref(false)

// 移动端打开目录
const toggleMenu = () => {
  if (!userStore.isMobile) return

  showMenu.value = !showMenu.value
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

        <div v-mobile-hidden class="select-file">
          <div class="select-file-btn">本地文件</div>
          <!-- <el-button class="select-file-btn">打开本地文件</el-button> -->
          <input
            type="file"
            webkitdirectory
            multiple
            class="select-file-input"
            @change="selectDirectory"
          />
        </div>

        <div v-mobile-hidden class="select-file">
          <div class="select-file-btn">上传文件</div>
          <input
            type="file"
            webkitdirectory
            multiple
            class="select-file-input"
            @change="uploadDirectory"
          />
        </div>
      </div>

      <!-- <div
        v-if="selectedFile && currSource && currSource.type === 'text' && !readonlyMode"
        class="top-middle"
      >
        <div @click="handleSetStyle('strong')">加粗</div>
        <div @click="handleSetStyle('emphasis')">斜体</div>
        <div @click="handleSetStyle('inlineCode')">行内代码</div>
        <div @click="handleSetStyle('blockCode')">代码块</div>
      </div> -->

      <div class="top-middle">
        <Directory
          ref="directoryRef"
          :readonly-mode="readonlyMode"
          :set-readonly-mode="setReadonlyMode"
        />
      </div>

      <div class="top-right">
        <template v-if="!readonlyMode">
          <el-button
            v-if="currSource && currSource.type === 'text'"
            :disabled="!selectedFile"
            @click="resetFileSource"
          >
            重置
          </el-button>
          <el-button v-if="currSource" :disabled="!selectedFile" @click="downloadFile">
            下载
          </el-button>
        </template>
      </div>

      <div v-if="userStore.isMobile" class="toggle-menu" @click="toggleMenu">
        <img src="../../assets/svgs/menu.svg" alt="" class="icon" />
      </div>
    </div>

    <div class="main-content">
      <FileTree
        :file-tree="fileTree"
        :selected-file="selectedFile"
        :handle-file-click="readonlyMode ? handleFileClickReadonly : handleFileClick"
        :show-menu="showMenu"
      />

      <div class="file-content">
        <div v-show="currSource && currSource.type === 'text'">
          <Editor
            ref="editorRef"
            :text="currSource ? currSource.content : ''"
            :readonly="readonlyMode"
            :curr-node="selectedFile"
          />
        </div>
        <div v-if="currSource && currSource.type === 'img'" class="image-wapper">
          <img :src="currSource.content" alt="image" />
        </div>

        <FloatingToolbar
          :selected-file="selectedFile"
          :curr-source="currSource"
          :readonly-mode="readonlyMode"
          :handle-set-style="handleSetStyle"
        />
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
      gap: 10px;
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
        position: relative;
        padding: 6px 12px;
        border-radius: 10px;
        font-weight: bold;
        font-size: 15px;
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
      padding-bottom: 80px;
      overflow: auto;
      width: 100%;
      height: calc(100vh - 60px);
      position: relative;

      .image-wapper {
        width: 100%;
        display: flex;
        justify-content: center;

        img {
          width: 1000px;
        }
      }
    }
  }

  @media (max-aspect-ratio: 1/1) {
    .toggle-menu {
      border: 1px solid var(--light-border-color-3);
      border-radius: 5px;
      padding: 4px;
      background-color: var(--normal-bgc);
      position: absolute;
      right: 10px;

      .icon {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 20px;
        height: 20px;
      }
    }
  }
}
</style>
