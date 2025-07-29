<script setup>
import { computed } from 'vue'
import { useMindmapStore } from '../stores/mindmap'

const mindmapStore = useMindmapStore()

const props = defineProps({
  showCustMenu: {
    type: String,
    default: ''
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  isEdited: {
    type: Boolean,
    default: false
  }
})

const emits = defineEmits(['update:showCustMenu', 'resetView', 'saveView', 'userAddNode', 'AIAddNode', 'editNode', 'deleteNode'])

// 关闭菜单
const closeMenu = () => {
  emits('update:showCustMenu', '') // 传递 false 给父组件，关闭菜单
}

const sizeMap = {
  'node': {
    width: 120,
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
</script>

<template>
  <div
    class="cust-menu"
    v-if="showCustMenu === 'node'"
    v-click-outside.stop="closeMenu"
    :style="positionStyle"
  >
    <div class="menu-item" @click="AIAddNode">AI生成子节点</div>
    <div class="menu-item" @click="userAddNode">自定义子节点</div>
    <div class="br"></div>
    <div class="menu-item" @click="editNode">编辑节点</div>
    <div class="menu-item" @click="deleteNode">删除节点</div>
    <div class="br"></div>
    <div class="menu-item">开始对话</div>
    <div class="menu-item">查看笔记</div>
    <div class="br"></div>
    <div class="menu-item" @click="resetView">{{ isEdited ? '取消更改' : '重置视图'}}</div>
    <div class="menu-item" @click="saveView">保存视图</div>
  </div>

  <div
    class="cust-menu"
    v-if="showCustMenu === 'normal'"
    v-click-outside.stop="closeMenu"
    :style="positionStyle"
  >
    <div class="menu-item" @click="resetView">{{ isEdited ? '取消更改' : '重置视图'}}</div>
    <div class="menu-item" @click="saveView">保存视图</div>
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
}
</style>
