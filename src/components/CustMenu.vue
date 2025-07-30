<script setup>
import { computed } from 'vue'
import { useMindmapStore } from '../stores/mindmap'
import { useUserInfoStore } from '../stores/user'

const mindmapStore = useMindmapStore()
const userStore = useUserInfoStore()

const props = defineProps({
  showCustMenu: {
    type: String,
    default: ''
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  node: {
    type: Object,
    default: () => ({})
  }
})

const emits = defineEmits([
  'update:showCustMenu', 'resetView', 'saveView', 'userAddNode', 'AIAddNode', 'editNode', 'deleteNode', 'deleteChildren', 'startChat', 'selectNode'
])

// 关闭菜单
const closeMenu = () => {
  emits('update:showCustMenu', '') // 传递 false 给父组件，关闭菜单
}

const sizeMap = {
  'node': {
    width: 140,
    height: 350
  },
  'normal': {
    width: 90,
    height: 100
  }
}

// 菜单位置样式
const positionStyle = computed(() => {
  const { width, height } = sizeMap[props.showCustMenu]

  const x = Math.min(props.position.x, window.innerWidth - width - 270)
  const y = Math.min(props.position.y, window.innerHeight - height)

  return {
    left: x + 'px',
    top: y + 'px',
    width: width + 'px'
  }
})

// 选择节点
const selectNode = () => {
  emits('selectNode')
  closeMenu()
}

// 重置视图
const resetView = () => {
  emits('resetView')
  closeMenu()
}

// 保存视图
const saveView = () => {
  emits('saveView')
  closeMenu()
}

// 用户添加节点
const userAddNode = () => {
  emits('userAddNode')
  closeMenu()
}

// AI添加节点
const AIAddNode = () => {
  emits('AIAddNode')
  closeMenu()
}

// 编辑节点
const editNode = () => {
  emits('editNode')
  closeMenu()
}

// 删除节点
const deleteNode = () => {
  emits('deleteNode')
  closeMenu()
}

// 删除子节点
const deleteChildren = () => { 
  emits('deleteChildren')
  closeMenu()
}

// 开始对话
const startChat = () => {
  emits('startChat')
  closeMenu()
}
</script>

<template>
  <div
    class="cust-menu"
    v-if="showCustMenu === 'node'"
    v-click-outside.stop="closeMenu"
    :style="positionStyle"
  >
    <template v-if="userStore.showDialog === 'quoteMindmap'">
      <div class="menu-item" @click="selectNode">选择该节点</div>
      <div class="br"></div>
    </template>
    <div class="menu-item" @click="AIAddNode">AI生成子节点</div>
    <div class="menu-item" @click="userAddNode">自定义子节点</div>
    <div class="br"></div>
    <div class="menu-item" @click="editNode">编辑节点</div>
    <div class="parent-menu">
      <div class="menu-item">删除节点/子节点</div>
      <!-- 子菜单 - 鼠标悬浮时显示 -->
      <div class="submenu">
        <div class="menu-item" @click.stop="deleteNode">删除节点</div>
        <div class="menu-item" @click.stop="deleteChildren">删除子节点</div>
      </div>
    </div>
    <div class="br"></div>
    <div class="menu-item" @click="startChat">开始对话</div>
    <div class="menu-item">查看笔记</div>
    <div class="br"></div>
    <div class="menu-item" @click="saveView">保存视图</div>
    <div class="menu-item" @click="resetView">{{ mindmapStore.isEdited ? '取消更改' : '刷新视图'}}</div>
  </div>

  <div
    class="cust-menu"
    v-if="showCustMenu === 'normal'"
    v-click-outside.stop="closeMenu"
    :style="positionStyle"
  >
    <div class="menu-item" @click="saveView">保存视图</div>
    <div class="menu-item" @click="resetView">{{ mindmapStore.isEdited ? '取消更改' : '刷新视图'}}</div>
  </div>
</template>

<style scoped lang="scss">
.cust-menu {
  background-color: var(--normal-bgc);
  position: absolute;
  border: 1px solid var(--light-border-color-1);
  border-radius: 10px;
  box-shadow: 0 2px 8px var(--box-shadow-color);
  padding: 8px;
  cursor: default;
  color: var(--text-color-0);

  .menu-item {
    padding: 8px;
    font-size: 14px;
    border-radius: 10px;

    &:hover {
      background-color: var(--menu-hover-color);
      color: var(--normal-bgc);
    }
  }

  .br {
    height: 1px;
    background-color: var(--light-border-color-1);
    margin: 3px 0;
    margin-left: 8px;
    margin-right: 8px;
    transform: scaleY(0.5); /* 对Y轴缩放，在2倍屏上等效1px物理像素 */
  }

  .parent-menu {
    position: relative;
    padding: 0;
    margin: 0;

    .submenu {
      position: absolute;
      top: 0;
      left: 100%;
      min-width: 105px;
      margin-left: 4px;
      margin-top: -8px;
      background-color: var(--normal-bgc);
      border: 1px solid var(--light-border-color-1);
      border-radius: 10px;
      box-shadow: 0 2px 8px var(--box-shadow-color);
      padding: 8px;
      z-index: 101;
      visibility: hidden;
      opacity: 0;
      transition: visibility 0.2s, opacity 0.2s;
    }

    &:hover .submenu {
      visibility: visible;
      opacity: 1;
    }
  }
}
</style>
