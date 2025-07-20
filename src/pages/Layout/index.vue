<script setup>
import { ref } from 'vue'

const sidebarRef = ref(null)
const mainViewRef = ref(null)

const foldSidebar = () => {
  sidebarRef.value.style.width = '0px'
  mainViewRef.value.style.width = '100vw'
  console.log(sidebarRef.value.style)
}
</script>

<template>
  <div class="layout">
    <div class="sidebar" ref="sidebarRef">
      <div class="tooltips">
        <div @click="foldSidebar">收起侧栏</div>
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
    transition: width 0.3s ease;

    .tooltips {
      height: 50px;
    }
  }

  .main-view {
    width: calc(100vw - 260px);
    transition: width 0.3s ease;
    display: flex;
    justify-content: center;
    background-color: var(--siderbar-bgc);
    padding: 5px;
    padding-left: 0;
  }
}
</style>
