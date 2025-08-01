<script setup>
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>

<template>
  <el-config-provider :locale="zhCn" :message="{ max: 3 }">
    <el-container>
      <router-view />
    </el-container>
  </el-config-provider>
</template>

<style scoped lang="scss">
</style>
