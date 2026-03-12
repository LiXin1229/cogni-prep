<script setup lang="ts">
import { h, type VNode } from 'vue'
import type { FileNode } from './type'

const props = defineProps<{
  fileTree: FileNode | null
  selectedFile: FileNode | null
  handleFileClick: (file: FileNode) => void
  showMenu: boolean
}>()

const renderTree = (node: FileNode): VNode => {
  const itemVNode = node.isFile
    ? h(
        'div',
        {
          class: {
            'tree-item': true,
            'file-item': true,
            'selected-file': node === props.selectedFile,
          },
          onClick: () => {
            props.handleFileClick(node)
          },
        },
        `📄 ${node.name}`
      )
    : h(
        'div',
        {
          class: 'dir-item tree-item',
          onClick: () => {
            node.isOpen = !node.isOpen
          },
        },
        node.isOpen ? `📂 ${node.name}` : `📁 ${node.name}`
      )

  const childrenVNodes = node.children.map((child) => renderTree(child))

  return h(
    'div',
    {
      style: {
        paddingLeft: `${node.depth * 4}px`,
      },
    },
    [itemVNode, ...(node.isOpen ? childrenVNodes : [])]
  )
}
</script>

<template>
  <div :class="['resize-menu', showMenu && 'show-menu']">
    <div v-if="fileTree" class="file-tree no-select">
      <component :is="renderTree(fileTree)" />
    </div>

    <div v-resizable class="resize-handle"></div>
  </div>
</template>

<style scoped lang="scss">
.resize-menu {
  display: flex;
  justify-content: left;
  width: 270px;
  min-width: 180px;
  max-width: 440px;
  background-color: var(--primary-bgc);

  .resize-handle {
    width: 5px;
    height: 100%;
    cursor: ew-resize;
  }

  ::-webkit-scrollbar-thumb {
    background: #c1c1c13f;
    border-radius: 4px;
  }

  .file-tree {
    width: calc(100% - 5px);
    height: calc(100vh - 60px);
    border-right: 1px solid var(--light-border-color-1);
    overflow-x: hidden;
    overflow-y: auto;

    .tree-item {
      cursor: pointer;
      padding: 4px 8px;
      color: var(--text-color-1);
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden; // 超出隐藏
      text-overflow: ellipsis; // 显示省略号
      white-space: nowrap; // 强制不换行

      &:hover:not(.selected-file) {
        background-color: var(--file-tree-item-hover);
      }
    }

    .selected-file {
      background-color: var(--tree-active-color);
    }
  }

  .no-select {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
}

@media (max-aspect-ratio: 1/1) {
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
}
</style>
