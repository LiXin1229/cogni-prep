<script setup lang="ts">
import { useNoteStore } from '@/stores/note'
import { useUserInfoStore } from '@/stores/user'
import { computed, onMounted, ref, watch, onUnmounted } from 'vue'
import { parseMarkdown } from '@/utils/markdown'
import Quill from 'quill'
import Delta from 'quill-delta'
import 'quill/dist/quill.bubble.css'
import { writeInClipboard } from '@/utils/clipboard'
import type { PartialNode, TreeNode } from '@/stores/types/note.type'

const noteStore = useNoteStore()
const userStore = useUserInfoStore()

defineProps({
  isSidebarFolded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleSidebar'])

const scrollRef = ref<any>(null)

// 切换头部领域
const selectArea = async (id: number) => {
  if (noteStore.sendState !== 'available') return

  if (id === noteStore.selectedAreaId) return
  noteStore.selectedAreaId = id

  noteStore.getTreeData()
}

const treeRef = ref<any>(null)

// 初始化目录
const initTreeData = async () => {
  await noteStore.getTreeData()
  const node = selectKey.value.find(item => item.areaId === noteStore.selectedAreaId)
  if (node) treeRef.value.setCurrentKey(node.nodeId)
}

// 初始化当前节点笔记
const initNote = async () => {
  const node = selectKey.value.find(item => item.areaId === noteStore.selectedAreaId)
  const markId = node?.markId
  // console.log(node)
  await noteStore.getNoteData({ markId })
}

watch(() => noteStore.selectedAreaId, async () => {
  await initTreeData()
  await initNote()
})

const treeData = computed(() => [noteStore.treeData ?? []])

const defaultProps = {
  children: 'children',
  label: 'name',
}

const selectKey = computed(() => noteStore.selectKey)

const currentNode = computed(() => selectKey.value.find(item => item.areaId === noteStore.selectedAreaId) || null)

// 点击节点
const handleNodeClick = async (data: PartialNode) => {
  // console.log(data)
  if (noteStore.sendState !== 'available') return

  // 获取当前节点笔记
  await noteStore.getNoteData(data)

  scrollRef.value.scrollTop = 0

  if (!isMarkdownMode.value) {
    insertText(noteStore.note)
  }

  // 更新当前节点缓存
  noteStore.updateSelectKey(data)

  toggleMenu()
}

// popup框
const showNodePopup = ref('')

const menuScrollRef = ref<any>(null)
const menuScrollTop = ref(0)

const togglePopup = (e?: MouseEvent, data?: TreeNode) => {
  menuScrollTop.value = menuScrollRef.value.scrollTop
  if (!e?.target) return showNodePopup.value = ''

  const svgs = ['svg', 'path', 'g', 'circle', 'rect']
  if (svgs.includes((e?.target as HTMLElement).tagName)) return
  if ((e?.target as HTMLElement).className?.includes('toggleNodePopup')) {
    showNodePopup.value === data!.id ? showNodePopup.value = '' : showNodePopup.value = data!.id
  } else {
    showNodePopup.value = ''
  }
}

const showMenu = ref(false)

// 移动端打开目录
const toggleMenu = () => {
  if (!userStore.isMobile) return

  showMenu.value = !showMenu.value
}

const openSelectedNode = () => {
  if (!selectKey.value.map(node => node.nodeId)?.[0]) return
  treeRef.value.setCurrentKey(selectKey.value.map(node => node.nodeId)[0], true)
}

// 生成笔记
const createNote = (node: TreeNode) => {
  if (noteStore.sendState !== 'available') return
  noteStore.getNote(node)
  showNodePopup.value = ''

  toggleMenu()
}

const addNode = (data: TreeNode) => {
  togglePopup()
  noteStore.selectedNode = data
  userStore.showDialog = 'userAddNode'
}

// 复制按钮
const handleClick = (e: MouseEvent) => {
  // console.log(e.target.closest('.copy-btn'))
  const copyBtn = (e.target as HTMLElement).closest('.copy-btn')
  if (!copyBtn) return

  const preElement = copyBtn.closest('pre')
  const codeElement = preElement?.querySelector('code')

  const imgElement = copyBtn.querySelector('img.icon')

  if (codeElement) {
    writeInClipboard(codeElement.textContent as string, imgElement as HTMLImageElement)
  }
}

const isMarkdownMode = computed({
  get: () => noteStore.isMarkdownMode,
  set: value => noteStore.isMarkdownMode = value
})

const isModified = ref(false)

// 切换模式
const toggleMode = () => {
  if (noteStore.sendState !== 'available' || !quillInstance) return

  if (isMarkdownMode.value) {
    insertText(noteStore.note)
  } else {
    const plainText = quillInstance.getText()
    // console.log(plainText)

    noteStore.note = plainText
  }

  isMarkdownMode.value = !isMarkdownMode.value
}

const editorRef = ref(null)
let quillInstance: any = null

onMounted(async () => {
  await initTreeData()
  await initNote()

  if (!editorRef.value) return
  
  quillInstance = new Quill(editorRef.value, {
    theme: 'bubble',
    modules: {
      toolbar: false, // 禁用工具栏
      clipboard: {
        matchVisual: false, // 禁用视觉粘贴
        matchers: [
          [Node.ELEMENT_NODE, (_: any, delta: any) => {
            // 提取纯文本
            const text = delta.reduce((acc: any, op: any) => {
              if (typeof op.insert === 'string') {
                acc += op.insert
              }
              return acc
            }, '')

            // 返回纯文本Delta
            return new Delta().insert(text)
          }]
        ]
      }
    }
  })

  quillInstance.on('text-change', (_: any, __: any, source: string) => {
    if (source === 'user') { // 仅处理用户操作导致的变化
      isModified.value = true
    }
  })
})

// 保存笔记
const saveNote = async () => {
  const markId = currentNode.value?.markId
  if (!markId) return

  if (!isMarkdownMode.value) toggleMode()

  if (await noteStore.updateNoteData(markId)) {
    isModified.value = false
  }
}

// 插入文本
const insertText = (text: string, position = 0) => {
  if (!quillInstance) return
  quillInstance.deleteText(0, quillInstance.getLength())
  quillInstance.insertText(position, text)
}

// 在组件中注册插入方法
noteStore.registerCallback('insertText', insertText)
noteStore.registerCallback('openSelectedNode', openSelectedNode)
noteStore.registerCallback('reLoadNote', async () => {
  await initTreeData()
  await initNote()
})

onUnmounted(() => {
  if (quillInstance) {
    quillInstance = null
  }
  noteStore.abortCurrentStream()
})
</script>

<template>
  <div class="note">
    <!-- 顶部区 -->
    <div class="top">
      <div class="toggle-sidebar" @click="emit('toggleSidebar')" v-show="isSidebarFolded">
        <img src="../../assets/svgs/hide-sidebar.svg" :style="{ transform: isSidebarFolded ? 'rotate(180deg)' : 'none' }" alt="" class="icon">
      </div>

      <div class="area-list">
        <div
          :class="['area-item', area.areaId === noteStore.selectedAreaId && 'selected-area']"
          v-for="area in noteStore.areaList"
          :key="area.areaId"
          @click="selectArea(area.areaId)"
        >
          {{ area.name }}
        </div>
        <div class="toggle-menu" v-if="userStore.isMobile" @click="toggleMenu">
          <img src="../../assets/svgs/menu.svg" alt="" class="icon">
        </div>
        <div class="tip" v-else>
          点击菜单&nbsp;&nbsp;<img src="../../assets/svgs/ellipsis.svg" style="width:16px;vertical-align:middle;">&nbsp;&nbsp;生成笔记
        </div>
      </div>
    </div>

    <div class="main-content">
      <div :class="['resize-menu', (userStore.isMobile && showMenu) && 'show-menu']">
        <!-- 目录区 -->
        <div class="sider-menu" ref="menuScrollRef">
          <div class="warpper">
            <el-tree
              ref="treeRef"
              node-key="id"
              :data="treeData"
              :props="defaultProps"
              @node-click="handleNodeClick"
              highlight-current
              :expand-on-click-node="false"
            >
              <template #default="{ node, data }">
                <div class="custom-tree-node">
                  <div :class="['text', data.markId && 'has-note']">{{ node.label }}</div>
                  <cust-popup :position="{ top: `${ 20 - menuScrollTop }px`, left: '-75px' }">
                    <div :class="['func-btn', 'toggleNodePopup', data.id === currentNode?.nodeId && 'visible']" @click.stop="(e) => togglePopup(e, data)" >
                      <img src="../../assets/svgs/ellipsis-bold.svg" alt="" class="icon toggleNodePopup">
                    </div>

                    <template #popup>
                      <div class="popup-menu" v-show="showNodePopup === data.id" v-click-outside.stop="(e: MouseEvent) => togglePopup(e, data)">
                        <div class="menu-item" @click="createNote(data)">生成笔记</div>
                        <div class="menu-item" @click.stop="addNode(data)">添加子节点</div>
                      </div>
                    </template>
                  </cust-popup>
                </div>
              </template>
            </el-tree>
          </div>
        </div>
        <div class="resize-handle" v-resizable></div>
      </div>

      <!-- 笔记内容区 -->
      <div class="mark-content" ref="scrollRef">
        <div class="button-container">
          <!-- 左上角按钮 -->
          <el-button @click="toggleMode" class="mode-toggle">
            {{ isMarkdownMode ? '切换到编辑' : '切换到查看' }}
          </el-button>
          <!-- 右上角按钮 -->
          <el-button @click="saveNote" class="save-btn" :disabled="!isModified">保存</el-button>
        </div>

        <!-- 观察view -->
        <div class="text-view" v-html="parseMarkdown(noteStore.note)" @click="handleClick" v-show="isMarkdownMode"></div>
        <!-- 编辑view -->
        <div class="editor-view">
          <div class="editor" ref="editorRef" v-show="!isMarkdownMode"></div>
        </div>

        <div class="text-view" v-show="noteStore.sendState === 'loading'">
          <!-- 等待响应的图标 -->
          <div class="loading-icon">
            <div class="left-ball"></div>
            <div class="right-ball"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/mixin.scss" as *;
@use "@/styles/loading.scss" as *;

.note {
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

    .area-list {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 10px;
      white-space: nowrap;

      .area-item {
        padding: 6px 12px;
        border-radius: 10px;
        font-weight: bold;
        font-size: 15px;
        position: relative;
        cursor: pointer;
      }

      .selected-area {
        background-color: var(--theme-color-1);
        color: var(--normal-bgc);
      }

      .tip {
        color: var(--text-color-4);
        font-size: 14px;
        cursor: default;
      }
    }
  }

  .main-content {
    display: flex;
    width: 100%;
    height: calc(100% - 50px);
  }

  .resize-menu {
    display: flex;
    justify-content: left;
    width: 270px;
    min-width: 180px;
    max-width: 440px;

    .resize-handle {
      width: 5px;
      height: 100%;
      cursor: ew-resize; /* 显示水平调整大小的光标 */
    }
  }

  .sider-menu {
    width: calc(100% - 5px);
    height: 100%;
    border-right: 1px solid var(--light-border-color-1);
    padding-right: 6px;
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: 45px;

    .warpper {
      width: calc(100% - 5px);
    }

    .custom-tree-node {
      display: flex;
      flex: 1;
      position: relative;
      background-color: aqua;

      .text {
        position: absolute;
        left: 0;
        top: -10px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        width: calc(100% - 30px);
      }

      .has-note {
        color: var(--light-blue-color);
      }

      .cust-popup {
        position: absolute;
        right: 2px;
        top: -10px;
        overflow: visible;

        .func-btn {
          width: 20px;
          height: 20px;
          border-radius: 8px;
          text-align: center;
          visibility: hidden;

          .icon {
            width: 14px;
            height: 14px;
          }

          &:hover {
            background-color: var(--light-border-color-2);
          }
        }

        .func-btn.visible {
          visibility: visible !important;
        }

        .popup-menu {
          background-color: var(--normal-bgc);
          border: 1px solid var(--light-border-color-1);
          border-radius: 6px;
          box-shadow: 0 2px 8px var(--box-shadow-color);
          padding: 4px;
          cursor: default;
          color: var(--text-color-0);
          position: fixed;

          .menu-item {
            padding: 6px;
            font-size: 13px;
            border-radius: 4px;

            &:hover {
              background-color: var(--menu-hover-color);
              color: var(--normal-bgc);
            }
          }
        }
      }
    }

    .el-tree-node__content:hover {
      .func-btn {
        visibility: visible;
      }
    }

    // 滚动条样式
    &::-webkit-scrollbar {
      display: none;
    }
    
    &:hover::-webkit-scrollbar {
      width: 5px;
      display: block;
    }

    &::-webkit-scrollbar-thumb {
      background: #c1c1c188;
    }

    :deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
      background-color: var(--tree-active-color);
    }
  }

  :deep(.mark-content) {
    flex: 1;
    overflow-y: auto;

    .button-container {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      justify-content: space-between;
    }

    .text-view, .editor-view {
      width: calc(70vw - 300px);
      margin: 0 auto;
      padding-bottom: 30px;
    }

    .loading-icon {
      display: flex;
      justify-content: space-between;
      width: 20px;
      height: 15px;
      margin-left: 20px;

      @include loading;
    }

    @include code-box;
  }

  @media (max-aspect-ratio: 1/1) {
    .top {
      .area-list {
        gap: 10px;
      }

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

    .resize-menu {
      width: 75%;
      position: absolute;
      left: 0;
      top: 50px;
      z-index: 999;
      transform: translateX(-100%);
      transition: transform 0.2s ease;

      .resize-handle {
        display: none;
      }
    }

    .resize-menu.show-menu {
      transform: translateX(0);
    }

    .warpper {
      width: 100% !important;
    }

    .sider-menu {
      width: 100%;
      height: calc(100vh - 50px);
      background-color: var(--normal-bgc);
    }

    .custom-tree-node {
      .text {
        font-size: 13px;
      }
    }

    .mark-content {
      padding: 0 5px;
      .text-view, .editor-view {
        width: 100%;
      }
    }
  }
}
</style>
