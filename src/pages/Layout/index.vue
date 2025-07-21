<script setup>
import { ref } from 'vue'

const sidebarRef = ref(null)
const mainViewRef = ref(null)

const isSidebarFolded = ref(false)

const toggleSidebar = () => {
  isSidebarFolded.value = !isSidebarFolded.value
  
  if (isSidebarFolded.value) {
    sidebarRef.value.style.transform = 'translateX(-100%)'
    mainViewRef.value.style.marginLeft = '0'
    // mainViewRef.value.style.width = '100'
  } else {
    sidebarRef.value.style.transform = 'translateX(0)'
    mainViewRef.value.style.marginLeft = '260px'
  }
}
</script>

<template>
  <div class="layout">
    <div class="sidebar" ref="sidebarRef">
      <div class="tooltips">
        <div @click="toggleSidebar">收起侧栏</div>
      </div>
      <div class="search-box">搜索框</div>
    </div>
    <div class="main-view" ref="mainViewRef">
      <router-view />
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout {
  display: flex;

  .sidebar {
    width: 260px;
    height: 100vh;
    background-color: var(--siderbar-bgc);
    border-right: 1px solid var(--light-border-color-1);
    transition: transform 0.3s ease;
    will-change: transform; // transform 提示浏览器优化
    position: relative;
    z-index: 1;
    flex-shrink: 0; // 防止侧栏意外收缩

    .tooltips {
      height: 50px;
    }
  }

  .main-view {
    width: calc(100vw - 260px);
    transition: margin-left 0.3s ease;
    display: flex;
    flex-grow: 1;
    justify-content: center;
    background-color: var(--siderbar-bgc);
    padding: 5px;
    padding-left: 0;
    min-width: 0; /* 防止内容溢出 */
  }
}
</style>
