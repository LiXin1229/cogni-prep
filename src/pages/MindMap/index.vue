<script setup>
import { onMounted, ref } from 'vue'
import { useMindmapStore } from '@/stores/mindmap'

const mindmapStore = useMindmapStore()

defineProps({
  isSidebarFolded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleSidebar'])

const mindMapRef = ref(null)

// 切换头部领域
const selectArea = async (id) => {
  if (id === mindmapStore.selectedAreaId) return

  // 保存上一次数据
  mindMapRef.value.saveData()

  mindmapStore.selectedAreaId = id

  // 更新图表
  await mindMapRef.value.updateData()
  mindMapRef.value.renderChart()
}

onMounted(() => {
  mindmapStore.getMindmapData()
})
</script>

<template>
  <div class="mind-map">
    <!-- 顶部区 -->
    <div class="top">
      <div class="toggle-sidebar" @click="emit('toggleSidebar')" v-show="isSidebarFolded">
        <img src="../../assets/svgs/hide-sidebar.svg" alt="" class="icon">
      </div>

      <div class="area-list">
        <div
          :class="['area-item', area.areaId === mindmapStore.selectedAreaId && 'selected-area', mindmapStore.isEdited && 'edited-icon']"
          v-for="area in mindmapStore.areaList"
          :key="area.id"
          @click="selectArea(area.areaId)"
        >
          {{ area.name }}
        </div>
      </div>
    </div>

    <!-- 树状图 -->
    <mind-map ref="mindMapRef" />
  </div>
</template>

<style scoped lang="scss">
.mind-map {
  width: 100%;
  height: 100%;
  background-color: var(--primary-bgc);
  position: relative;

  .top {
    width: 100%;
    height: 50px;
    display: flex;
    align-items: center;
    padding: 0 20px;
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

      .edited-icon {
        &::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--normal-bgc);
          position: absolute;
          top: 5px;
          left: 6px;
        }
      }
    }
  }
}
</style>
