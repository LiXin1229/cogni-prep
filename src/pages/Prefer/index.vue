<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePreferStore } from '@/stores/prefer'
import { formatDate } from '@/utils/formatDate'

const route = useRoute()
const router = useRouter()
const preferStore = usePreferStore()

defineProps({
  isSidebarFolded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleSidebar'])

onMounted(() => {
  preferStore.getPreferList()
})

const isDetailPage = computed(() => {
  return route.name === '收藏详情'
})

const preferList = computed(() => preferStore.preferList)

const navToDetail = (item) => { 
  preferStore.detailChats = []
  router.push({
    name: '收藏详情',
    params: {
      preferId: item.id
    }
  })
}
</script>

<template>
  <div class="prefer-view">
    <router-view :isSidebarFolded="isSidebarFolded" @toggleSidebar="emit('toggleSidebar')" />

    <!-- 顶部区 -->
    <div class="top" v-if="!isDetailPage">
      <div class="toggle-sidebar" @click="emit('toggleSidebar')" v-show="isSidebarFolded">
        <img src="../../assets/svgs/hide-sidebar.svg" :style="{ transform: isSidebarFolded ? 'rotate(180deg)' : 'none' }" alt="" class="icon">
      </div>
      <div>
        <div class="title">我的收藏</div>
        <div class="tip">内容由 <span style="font-style: italic;">DeepSeek-V3</span> 生成</div>
      </div>
    </div>

    <div class="scroll-view" v-if="!isDetailPage">
      <div class="prefer-list">
        <div class="prefer-item" v-for="item in preferList" @click="() => navToDetail(item)">
          <div class="title">{{ item.title }}</div>
          <div class="content">
            <div>{{ item.content }}</div>
          </div>
          <div class="date">{{ item.date }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.prefer-view {
  width: 100%;
  height: 100%;
  background-color: var(--primary-bgc);
  position: relative;

  .top {
    height: 50px;
    display: flex;
    align-items: center;
    padding: 0 20px;

    .title {
      font-weight: 600;
      color: var(--theme-color-1);
    }

    .tip {
      font-size: 12px;
      color: var(--text-color-4);
    }

    .toggle-sidebar {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 24px;
      height: 24px;
      border-radius: 5px;
      margin-right: 15px;

      .icon {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background-color: var(--btn-hover);
      }
    }
  }

  .scroll-view {
    height: calc(100% - 50px);
    overflow-y: auto;

    .prefer-list {
      width: calc(75vw - 300px);
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 18px;
      padding-top: 20px;

      .prefer-item {
        height: 220px;
        border: 1px solid var(--light-border-color-2);
        border-radius: 10px;
        box-shadow: 1px 1px 10px 1px var(--box-shadow-color);
        padding: 10px;
        transition: 0.2s all ease-in-out;
        cursor: pointer;

        &:hover { 
          transform: translateY(-3px);
          box-shadow: 3px 5px 10px 1px var(--box-shadow-color);
        }

        .title {
          font-size: 18px;
          color: var(--theme-color-1);
          margin-bottom: 5px;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }

        .content {
          font-size: 14px;
          color: var(--text-color-3);
          height: 143px;
          display: flex;
          align-items: center;
        }

        .date {
          font-size: 12px;
          color: var(--text-color-4);
          text-align: right;
        }
      }
    }
  }

  @media (max-aspect-ratio: 1/1) {
    .scroll-view {
      padding: 0 10px;

      .prefer-list {
        width: 100%;

        .prefer-item {
          height: 130px;

          .content {
            align-items: flex-start;
            height: 64px;
            overflow: hidden;
          }
        }
      }
    }
  }
}
</style>
