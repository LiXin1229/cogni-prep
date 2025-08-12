<script setup>
import { useNoteStore } from '@/stores/note'
import { computed, onMounted, ref, watch, onUnmounted } from 'vue'
import { parseMarkdown } from '@/utils/markdown'
import Quill from 'quill'
import Delta from 'quill-delta'
import 'quill/dist/quill.bubble.css'

const noteStore = useNoteStore()

defineProps({
  isSidebarFolded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleSidebar'])

const scrollRef = ref(null)

// 切换头部领域
const selectArea = async (id) => {
  if (noteStore.sendState !== 'available') return

  if (id === noteStore.selectedAreaId) return
  noteStore.selectedAreaId = id

  noteStore.getTreeData()
}

const treeRef = ref(null)

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

watch(() => noteStore.selectedAreaId, () => {
  initTreeData()
})

const treeData = computed(() => [noteStore.treeData])

const defaultProps = {
  children: 'children',
  label: 'name',
}

const selectKey = computed(() => noteStore.selectKey)

// 点击节点
const handleNodeClick = async (data) => {
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
}

// popup框
const showNodePopup = ref('')

const togglePopup = (e, data) => {
  // console.log(e)
  const svgs = ['svg', 'path', 'g', 'circle', 'rect']
  if (svgs.includes(e.target.tagName)) return
  if (e.target.className?.includes('toggleNodePopup')) {
    showNodePopup.value === data.id ? showNodePopup.value = '' : showNodePopup.value = data.id
  } else {
    showNodePopup.value = ''
  }
}

// 生成笔记
const createNote = (node) => {
  if (noteStore.sendState !== 'available') return
  noteStore.getNote(node)
}

// 复制按钮
const handleClick = (e) => {
  // console.log(e.target.closest('.copy-btn'))
  const copyBtn = e.target.closest('.copy-btn')
  if (!copyBtn) return

  const preElement = copyBtn.closest('pre')
  const codeElement = preElement?.querySelector('code')

  if (codeElement) {
    // 执行复制逻辑
    navigator.clipboard.writeText(codeElement.textContent)
      .then(() => {
        const imgElement = copyBtn.querySelector('img.icon')
        if (!imgElement) return

        const originalSrc = imgElement.src

        // 切换为"已复制"图片
        imgElement.src = '/src/assets/svgs/gou.svg'

        setTimeout(() => {
          imgElement.src = originalSrc
          imgElement.classList.remove('copied-animation')
        }, 5000)
      })
      .catch((err) => {
        console.log(err)
        ElMessage({
          message: '复制失败',
          type: 'info'
        })
        return
      })
  }
}

const isMarkdownMode = computed({
  get: () => noteStore.isMarkdownMode,
  set: value => noteStore.isMarkdownMode = value
})

const isModified = ref(false)

// 切换模式
const toggleMode = () => {
  if (noteStore.sendState !== 'available') return

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
let quillInstance = null

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
          [Node.ELEMENT_NODE, (node, delta) => {
            // 提取纯文本
            const text = delta.reduce((acc, op) => {
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

  quillInstance.on('text-change', (delta, oldContents, source) => {
    if (source === 'user') { // 仅处理用户操作导致的变化
      isModified.value = true
    }
  })
})

// 保存笔记
const saveNote = async () => {
  const node = selectKey.value.find(item => item.areaId === noteStore.selectedAreaId)
  const markId = node?.markId
  // return
  if (await noteStore.updateNoteData(markId)) {
    isModified.value = false
  }
}

// 插入文本
const insertText = (text, position = 0) => {
  if (!quillInstance) return
  quillInstance.deleteText(0, quillInstance.getLength())
  quillInstance.insertText(position, text)
}

// 在组件中注册插入方法
noteStore.registerCallback('insertText', insertText)

onUnmounted(() => {
  if (quillInstance) {
    quillInstance = null
  }
  noteStore.abortCurrentStream()

  noteStore.registerCallback({})
})
</script>

<template>
  <div class="note">
    <!-- 顶部区 -->
    <div class="top">
      <div class="toggle-sidebar" @click="emit('toggleSidebar')" v-show="isSidebarFolded">
        <img src="../../assets/svgs/hide-sidebar.svg" alt="" class="icon">
      </div>

      <div class="area-list">
        <div
          :class="['area-item', area.areaId === noteStore.selectedAreaId && 'selected-area']"
          v-for="area in noteStore.areaList"
          :key="area.id"
          @click="selectArea(area.areaId)"
        >
          {{ area.name }}
        </div>
        <div class="tip">
          点击菜单&nbsp;&nbsp;<img src="../../assets/svgs/ellipsis.svg" style="width:16px;vertical-align:middle;">&nbsp;&nbsp;生成笔记
        </div>
      </div>
    </div>

    <div class="main-content">
      <!-- 目录区 -->
      <div class="sider-menu">
        <div class="warpper">
          <!-- {{ treeData }} -->
          <el-tree
            ref="treeRef"
            node-key="id"
            :data="treeData"
            :props="defaultProps"
            @node-click="handleNodeClick"
            highlight-current
            :default-expanded-keys="selectKey"
            :expand-on-click-node="false"
          >
            <template #default="{ node, data }">
              <div class="custom-tree-node" @click="(e) => togglePopup(e, data)">
                <div :class="['text', data.markId && 'has-note']">{{ node.label }}</div>
                <cust-popup :position="{ top: '20px', left: '-75px' }">
                  <div :class="['func-btn', 'toggleNodePopup', data.id === selectKey[0]?.nodeId && 'visible']" @click.stop="(e) => togglePopup(e, data)" >
                    <img src="../../assets/svgs/ellipsis-bold.svg" alt="" class="icon toggleNodePopup">
                  </div>

                  <template #popup>
                    <div class="popup-menu" v-show="showNodePopup === data.id" v-click-outside.stop="(e) => togglePopup(e, data)">
                      <div class="menu-item" @click="() => createNote(data)">生成笔记</div>
                    </div>
                  </template>
                </cust-popup>
              </div>
            </template>
          </el-tree>
        </div>
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

    .toggle-sidebar {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 24px;
      height: 24px;
      border-radius: 5px;
      margin-right: 10px;
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
      gap: 20px;

      .area-item {
        padding: 6px 12px;
        border-radius: 10px;
        font-weight: bold;
        font-size: 15px;
        position: relative;
        white-space: nowrap;
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

  .sider-menu {
    width: 265px;
    height: 100%;
    border-right: 1px solid var(--light-border-color-1);
    padding-right: 6px;
    overflow-x: hidden;
    overflow-y: auto;

    .warpper {
      width: 260px;
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
    @include code-box;
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
      line-height: 2;
      width: calc(70vw - 300px);
      margin: 0 auto;
      padding-bottom: 30px;
    }

    .loading-icon {
      display: flex;
      justify-content: space-between;
      width: 20px;
      height: 15px;

      @include loading;
    }
  }
}
</style>
