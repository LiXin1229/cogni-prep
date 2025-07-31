<script setup>
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { onMounted, reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useUserInfoStore } from '@/stores/user'
import SelectAreaDialog from './SelectAreaDialog.vue'
import SelectPointDialog from './SelectPointDialog.vue'
import UserAddNode from './UserAddNode.vue'
import AIAddNode from './AIAddNode.vue'
import EditNode from './EditNode.vue'
import DeleteNode from './DeleteNode.vue'
import DeleteChildren from './DeleteChildren.vue'
import QuoteMindmap from './QuoteMindmap.vue'

import canlendar from '@/assets/svgs/canlendar.svg'
import siweidaotu from '@/assets/svgs/siweidaotu.svg'
import penToSquare from '@/assets/svgs/pen-to-square.svg'
import star from '@/assets/svgs/star.svg'
import userTie from '@/assets/svgs/user-tie.svg'

const router = useRouter()
const route = useRoute()
const sessionStore = useSessionStore()
const userStore = useUserInfoStore()

const sidebarRef = ref(null)
const mainViewRef = ref(null)

const isSidebarFolded = ref(false)

const toggleSidebar = () => {
  isSidebarFolded.value = !isSidebarFolded.value
}

const navberList = reactive([
  { id: 1, title: '每日刷题', icon: canlendar, path: 'chat' },
  { id: 2, title: '知识点图', icon: siweidaotu, path: 'mindmap' },
  { id: 3, title: '笔记', icon: penToSquare, path: 'note' },
  { id: 4, title: '收藏', icon: star, path: 'prefer' },
  { id: 5, title: '模拟面试', icon: userTie, path: 'interview' },
])

const navToPage = (nav) => {
  router.push({
    name: nav.title,
  })
}

// 当前选中的导航栏
const seclectedNav = computed(() => route.name) // 让当前选中的导航栏路由名称

// 当前选中的会话
const seclectedSession = computed(() => +route.params.sessionId)

const navToSession = (sessionId) => {
  router.push({
    name: '会话',
    params: { sessionId }
  })
}

onMounted(async() => {
  // toggleSidebar()
  await userStore.getUserInfo()
  await sessionStore.getSessionList()
})
</script>

<template>
  <div class="layout">
    <div :class="['sidebar', isSidebarFolded && 'sidebar-folded']" ref="sidebarRef">
      <div class="tooltips">
        <div @click="toggleSidebar">收起侧栏</div>
      </div>

      <!-- 搜索区 -->
      <div class="search-view">
        <div class="search-box">
          <div class="left">
            <font-awesome-icon :icon="faMagnifyingGlass" class="icon" />
            <div>搜索</div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="37" height="14" fill="none" viewBox="0 0 37 14" class="short"><rect width="22.3" height="12.3" x="0.35" y="0.85" stroke="currentColor" stroke-width="0.7" rx="1.65"></rect><path fill="currentColor" d="M6.97 10.666c-1.913 0-3.11-1.416-3.11-3.682v-.01c0-2.27 1.192-3.686 3.106-3.686 1.484 0 2.642.933 2.852 2.285l-.005.01h-.884l-.005-.01C8.69 4.67 7.938 4.1 6.966 4.1c-1.353 0-2.202 1.113-2.202 2.876v.01c0 1.762.85 2.87 2.207 2.87.981 0 1.728-.502 1.948-1.313l.01-.01h.889v.01c-.235 1.289-1.348 2.124-2.847 2.124m5.885-.127c-1.084 0-1.538-.4-1.538-1.406V5.939h-.83v-.703h.83V3.874h.879v1.362h1.152v.703h-1.152v2.979c0 .62.215.87.761.87.152 0 .235-.006.391-.02v.722c-.166.03-.327.05-.493.05m1.563-.039V5.236h.85v.782h.077c.2-.552.694-.874 1.407-.874.16 0 .341.02.424.034v.825a3 3 0 0 0-.522-.049c-.81 0-1.387.513-1.387 1.284V10.5zm3.657 0V3.146h.85V10.5z"></path><rect width="12.3" height="12.3" x="24.35" y="0.85" stroke="currentColor" stroke-width="0.7" rx="1.65"></rect><path fill="currentColor" d="M28.103 10.5V3.454h.878v3.423h.079l3.085-3.423h1.104l-2.817 3.042 3.076 4.004H32.37l-2.544-3.394-.845.933V10.5z"></path></svg>
        </div>
      </div>

      <!-- nav列表区 -->
      <div class="nav-list">
        <div v-for="navbar in navberList" :key="navbar" :class="['navbar-item', navbar.title === seclectedNav && 'selected-nav']" @click="navToPage(navbar)">
          <img :src="navbar.icon" alt="" class="icon">
          <div>{{ navbar.title }}</div>
        </div>
      </div>

      <!-- 历史对话区 -->
      <div class="session-list">
        <div class="history-top">
          <div class="title">历史对话</div>
        </div>
        <div class="session-warpper">
          <div v-for="session in sessionStore.sessionList" :key="session.sessionId" :class="['session-item', session.sessionId === seclectedSession && 'selected-nav']" @click="navToSession(session.sessionId)">
            <div class="title">{{ session.title }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主视图区 -->
    <div :class="['main-view', isSidebarFolded && 'main-folded']" ref="mainViewRef">
      <router-view @toggleSidebar="toggleSidebar" :isSidebarFolded="isSidebarFolded" />
    </div>

    <!-- Dialog -->
    <select-area-dialog :showDialog="userStore.showDialog === 'selectArea'" />
    <select-point-dialog :showDialog="userStore.showDialog === 'selectPoint'" />
    <user-add-node :showDialog="userStore.showDialog === 'userAddNode'" />
    <AI-add-node :showDialog="userStore.showDialog === 'AIAddNode'" />
    <edit-node :showDialog="userStore.showDialog === 'editNode'" />
    <delete-node :showDialog="userStore.showDialog === 'deleteNode'" />
    <delete-children :showDialog="userStore.showDialog === 'deleteChildren'" />
    <quote-mindmap :showDialog="userStore.showDialog === 'quoteMindmap'" />
  </div>
</template>

<style scoped lang="scss">
.layout {
  display: flex;
  position: relative;
  overflow: hidden;

  .sidebar {
    width: 260px;
    height: 100vh;
    padding: 12px;
    background-color: var(--siderbar-bgc);
    border-right: 1px solid var(--light-border-color-1);
    transition: transform 0.3s ease;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10;

    .tooltips {
      height: 50px;
    }

    .search-view {
      .icon {
        margin-right: 10px;
      }

      .search-box {
        padding: 0 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: var(--search-bgc);
        color: var(--main-color);
        font-size: 14px;
        border-radius: 10px;
        height: 35px;
        border: 1px solid var(--light-blue-color);

        .left {
          display: flex;
          justify-content: left;
          align-items: center;
        }

        .short {
          opacity: 0.5;
        }

        &:hover {
          background-color: var(--light-main-active-color);
        }
      }
    }

    .nav-list {
      .navbar-item {
        display: flex;
        justify-content: left;
        align-items: center;
        height: 35px;
        padding: 0 10px;
        margin: 8px 0;
        border-radius: 10px;
        font-size: 15px;
        color: var(--text-color-1);

        .icon {
          margin-right: 10px;
          width: 16px;
          height: 16px;
        }

        &:hover:not(.selected-nav) {
          background-color: var(--navber-hover);
        }
      }

      .selected-nav {
        background-color: var(--primary-bgc);
        box-shadow: 1px 1px 5px 1px var(--box-shadow-color);
      }
    }

    .session-list {
      margin-top: 18px;
      padding: 18px 0;
      border-top: 1px solid var(--light-border-color-1);

      .history-top {
        display: flex;
        justify-content: space-between;
        padding: 0 10px;
        
        .title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: var(--text-color-4);
          height: 30px;
          margin-bottom: 5px;
        }
      }

      .session-warpper {
        overflow: auto;
        height: calc(100vh - 390px);

        .session-item {
          display: flex;
          justify-content: left;
          align-items: center;
          height: 35px;
          padding: 0 10px;
          margin: 5px 6px;
          border-radius: 10px;
          font-size: 15px;
          color: var(--text-color-1);
          transition: all 0.3s ease;

          .title {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          &:hover:not(.selected-nav) {
            background-color: var(--navber-hover);
          }
        }

        .selected-nav {
          background-color: var(--primary-bgc);
          box-shadow: 1px 1px 5px 1px var(--box-shadow-color);
        }

        &::-webkit-scrollbar {
          display: none;
        }

        &::-webkit-scrollbar-thumb {
          background: #c1c1c188;
        }

        &:hover::-webkit-scrollbar {
          width: 5px;
          display: block;
        }
      }
    }
  }

  .main-view {
    width: calc(100vw - 260px);
    height: 100vh;
    transition: all 0.3s ease;
    margin: 0 auto;
    margin-left: 260px;
    background-color: var(--siderbar-bgc);
    padding: 5px;
    padding-left: 0;
  }

  .sidebar-folded {
    transform: translateX(-100%);
  }

  .main-folded {
    width: 100vw;
    margin-left: 0;
  }
}
</style>
