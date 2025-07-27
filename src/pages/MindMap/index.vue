<script setup>
import { useUserInfoStore } from '@/stores/user'
import { useMindmapStore } from '@/stores/mindmap'

const userStore = useUserInfoStore()
const mindmapStore = useMindmapStore()

defineProps({
  isSidebarFolded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleSidebar'])

const selectArea = (id) => {
  if (id === mindmapStore.selectedAreaId) return

  mindmapStore.selectedAreaId = id
}
</script>

<template>
  <div class="mind-map">
    <!-- 顶部区 -->
    <div class="top">
      <div class="toggleSidebar" @click="emit('toggleSidebar')" v-show="isSidebarFolded">打开侧栏</div>

      <div class="area-list">
        <div
          :class="['area-item', area.areaId === mindmapStore.selectedAreaId && 'selected-area']"
          v-for="area in mindmapStore.areaList"
          :key="area.id"
          @click="selectArea(area.areaId)"
        >
          {{ area.name }}
        </div>
      </div>
    </div>

    <div class="map-container">

    </div>
  </div>
</template>

<style scoped lang="scss">
.mind-map {
  width: 100%;
  height: 100%;
  background-color: var(--primary-bgc);
  position: relative;

  .top {
    height: 50px;
    display: flex;
    align-items: center;
    padding: 0 20px;

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
      }

      .selected-area {
        background-color: var(--theme-color-1);
        color: var(--normal-bgc);
      }
    }
  }

  .map-container {
    height: calc(100% - 50px);
  }
}
</style>
