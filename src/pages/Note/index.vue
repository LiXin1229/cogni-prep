<script setup>
import { useNoteStore } from '@/stores/note'
import { computed, onMounted, ref, watch } from 'vue'
import { parseMarkdown } from '@/utils/markdown'

const noteStore = useNoteStore()

defineProps({
  isSidebarFolded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleSidebar'])

// 切换头部领域
const selectArea = async (id) => {
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
  await noteStore.getNoteData({ markId })
}

onMounted(async () => {
  await initTreeData()
  initNote()
})

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
const handleNodeClick = (data) => {
  // console.log(data)
  // 获取当前节点笔记
  noteStore.getNoteData(data)

  // 更新当前节点缓存
  noteStore.updateSelectKey(data)
  // console.log(noteStore.selectKey)
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
</script>

<template>
  <div class="note">
    <!-- 顶部区 -->
    <div class="top">
      <div class="toggleSidebar" @click="emit('toggleSidebar')" v-show="isSidebarFolded">打开侧栏</div>

      <div class="area-list">
        <div
          :class="['area-item', area.areaId === noteStore.selectedAreaId && 'selected-area']"
          v-for="area in noteStore.areaList"
          :key="area.id"
          @click="selectArea(area.areaId)"
        >
          {{ area.name }}
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
                <cust-popup :position="{ top: '0px', left: '-80px' }">
                  <div class="func-btn toggleNodePopup" @click.stop="(e) => togglePopup(e, data)" >
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
      <div class="mark-content">
        <div class="text-view" v-html="parseMarkdown(noteStore.note)" @click="handleClick"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/mixin.scss" as *;

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
    overflow-x: auto;
    overflow-y: hidden;

    .toggleSidebar {
      position: absolute;
      left: 10px;
      top: 10px;
    }

    .area-list {
      display: flex;
      justify-content: flex-start;
      gap: 20px;

      .area-item {
        padding: 6px 12px;
        border-radius: 10px;
        font-weight: bold;
        font-size: 15px;
        position: relative;
        white-space: nowrap;
      }

      .selected-area {
        background-color: var(--theme-color-1);
        color: var(--normal-bgc);
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

        .popup-menu {
          background-color: var(--normal-bgc);
          border: 1px solid var(--light-border-color-1);
          border-radius: 6px;
          box-shadow: 0 2px 8px var(--box-shadow-color);
          padding: 5px;
          cursor: default;
          color: var(--text-color-0);

          .menu-item {
            padding: 5px;
            font-size: 14px;
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

    .text-view {
      width: calc(70vw - 300px);
      margin: 0 auto;
      padding: 30px 0;
    }
  }
}
</style>
