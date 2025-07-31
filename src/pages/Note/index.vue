<script setup>
import { useNoteStore } from '@/stores/note'
import { area } from 'd3'
import { computed, onMounted, ref, watch } from 'vue'

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

onMounted(() => {
  initTreeData()
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
  const node = selectKey.value.find(item => item.areaId === noteStore.selectedAreaId)
  if (node) {
    node.nodeId = data.id
  } else {
    noteStore.selectKey.push({
      areaId: noteStore.selectedAreaId,
      nodeId: data.id
    })
  }
}

// popup框
const showNodePopup = ref('')

const togglePopup = (e, data) => {
  const svgs = ['svg', 'path', 'g', 'circle', 'rect']
  if (svgs.includes(e.target.tagName)) return
  if (e.target.className?.includes('toggleNodePopup')) {
    console.log('data', data)
    showNodePopup.value = data.id
  } else {
    showNodePopup.value = ''
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
              <div class="custom-tree-node">
                <div class="text">{{ node.label }}</div>
                <cust-popup :position="{ top: '0px', left: '-80px' }">
                  <div class="func-btn toggleNodePopup" @click.stop="(e) => togglePopup(e, data)" >
                    <!-- <img src="../../assets/svgs/arrow-main-color.svg" alt="" class="icon toggleNodePopup"> -->
                    <img src="../../assets/svgs/ellipsis-bold.svg" alt="" class="icon toggleNodePopup">
                  </div>

                  <template #popup>
                    <div class="popup-menu" v-show="showNodePopup === data.id" v-click-outside.stop="togglePopup">
                      <div class="menu-item">生成笔记</div>
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
        <div class="text-view">
          请解释JavaScript中的事件循环机制，并说明宏任务和微任务的区别。

@思路+答案
回答思路
理解事件循环的基本概念：首先解释JavaScript的事件循环是什么，以及它在JavaScript执行模型中的作用。
区分宏任务和微任务：明确宏任务和微任务的定义，以及它们在事件循环中的不同处理顺序。
举例说明：通过具体的例子来说明宏任务和微任务在实际代码中的表现，帮助理解。
总结区别：最后总结宏任务和微任务的主要区别，强调它们在事件循环中的优先级和执行顺序。
标准答案
JavaScript的事件循环机制是其非阻塞I/O操作和异步编程的核心。事件循环允许JavaScript在执行代码、处理事件和执行异步任务时保持高效。

事件循环机制
事件循环的工作方式是不断检查调用栈是否为空。如果调用栈为空，事件循环会从任务队列中取出第一个任务来执行。这个过程不断重复，因此称为“事件循环”。

宏任务和微任务的区别
宏任务（MacroTask）：包括整体代码script、setTimeout、setInterval、I/O操作、UI渲染等。宏任务在每次事件循环的迭代中执行一个。
微任务（MicroTask）：包括Promise.then、process.nextTick（Node.js环境）、MutationObserver等。微任务在当前宏任务执行完毕后立即执行，即在当前事件循环的末尾执行。
关键区别
执行顺序：在一个事件循环中，微任务总是在宏任务之前执行。
优先级：微任务有更高的优先级，这意味着一旦当前宏任务完成，所有微任务都会在下一个宏任务开始之前执行完毕。
示例
console.log('script start'); // 宏任务

setTimeout(function() {
  console.log('setTimeout'); // 宏任务
}, 0);

Promise.resolve().then(function() {
  console.log('promise1'); // 微任务
}).then(function() {
  console.log('promise2'); // 微任务
});

console.log('script end'); // 宏任务
输出顺序：script start -> script end -> promise1 -> promise2 -> setTimeout。

总结
宏任务和微任务的主要区别在于它们的执行时机和优先级。微任务在当前宏任务执行完毕后立即执行，而宏任务则在事件循环的下一个迭代中执行。理解这一点对于编写高效的异步JavaScript代码至关重要。

请解释什么是虚拟DOM以及它在现代前端框架中的作用请解释JavaScript中的事件循环机制，并说明宏任务和微任务的区别。

@思路+答案
回答思路
理解事件循环的基本概念：首先解释JavaScript的事件循环是什么，以及它在JavaScript执行模型中的作用。
区分宏任务和微任务：明确宏任务和微任务的定义，以及它们在事件循环中的不同处理顺序。
举例说明：通过具体的例子来说明宏任务和微任务在实际代码中的表现，帮助理解。
总结区别：最后总结宏任务和微任务的主要区别，强调它们在事件循环中的优先级和执行顺序。
标准答案
JavaScript的事件循环机制是其非阻塞I/O操作和异步编程的核心。事件循环允许JavaScript在执行代码、处理事件和执行异步任务时保持高效。

事件循环机制
事件循环的工作方式是不断检查调用栈是否为空。如果调用栈为空，事件循环会从任务队列中取出第一个任务来执行。这个过程不断重复，因此称为“事件循环”。

宏任务和微任务的区别
宏任务（MacroTask）：包括整体代码script、setTimeout、setInterval、I/O操作、UI渲染等。宏任务在每次事件循环的迭代中执行一个。
微任务（MicroTask）：包括Promise.then、process.nextTick（Node.js环境）、MutationObserver等。微任务在当前宏任务执行完毕后立即执行，即在当前事件循环的末尾执行。
关键区别
执行顺序：在一个事件循环中，微任务总是在宏任务之前执行。
优先级：微任务有更高的优先级，这意味着一旦当前宏任务完成，所有微任务都会在下一个宏任务开始之前执行完毕。
示例
console.log('script start'); // 宏任务

setTimeout(function() {
  console.log('setTimeout'); // 宏任务
}, 0);

Promise.resolve().then(function() {
  console.log('promise1'); // 微任务
}).then(function() {
  console.log('promise2'); // 微任务
});

console.log('script end'); // 宏任务
输出顺序：script start -> script end -> promise1 -> promise2 -> setTimeout。

总结
宏任务和微任务的主要区别在于它们的执行时机和优先级。微任务在当前宏任务执行完毕后立即执行，而宏任务则在事件循环的下一个迭代中执行。理解这一点对于编写高效的异步JavaScript代码至关重要。

请解释什么是虚拟DOM以及它在现代前端框架中的作用
          请解释JavaScript中的事件循环机制，并说明宏任务和微任务的区别。

@思路+答案
回答思路
理解事件循环的基本概念：首先解释JavaScript的事件循环是什么，以及它在JavaScript执行模型中的作用。
区分宏任务和微任务：明确宏任务和微任务的定义，以及它们在事件循环中的不同处理顺序。
举例说明：通过具体的例子来说明宏任务和微任务在实际代码中的表现，帮助理解。
总结区别：最后总结宏任务和微任务的主要区别，强调它们在事件循环中的优先级和执行顺序。
标准答案
JavaScript的事件循环机制是其非阻塞I/O操作和异步编程的核心。事件循环允许JavaScript在执行代码、处理事件和执行异步任务时保持高效。

事件循环机制
事件循环的工作方式是不断检查调用栈是否为空。如果调用栈为空，事件循环会从任务队列中取出第一个任务来执行。这个过程不断重复，因此称为“事件循环”。

宏任务和微任务的区别
宏任务（MacroTask）：包括整体代码script、setTimeout、setInterval、I/O操作、UI渲染等。宏任务在每次事件循环的迭代中执行一个。
微任务（MicroTask）：包括Promise.then、process.nextTick（Node.js环境）、MutationObserver等。微任务在当前宏任务执行完毕后立即执行，即在当前事件循环的末尾执行。
关键区别
执行顺序：在一个事件循环中，微任务总是在宏任务之前执行。
优先级：微任务有更高的优先级，这意味着一旦当前宏任务完成，所有微任务都会在下一个宏任务开始之前执行完毕。
示例
console.log('script start'); // 宏任务

setTimeout(function() {
  console.log('setTimeout'); // 宏任务
}, 0);

Promise.resolve().then(function() {
  console.log('promise1'); // 微任务
}).then(function() {
  console.log('promise2'); // 微任务
});

console.log('script end'); // 宏任务
输出顺序：script start -> script end -> promise1 -> promise2 -> setTimeout。

总结
宏任务和微任务的主要区别在于它们的执行时机和优先级。微任务在当前宏任务执行完毕后立即执行，而宏任务则在事件循环的下一个迭代中执行。理解这一点对于编写高效的异步JavaScript代码至关重要。

请解释什么是虚拟DOM以及它在现代前端框架中的作用
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
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

  .mark-content {
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
