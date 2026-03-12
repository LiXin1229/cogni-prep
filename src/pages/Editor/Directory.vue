<script setup lang="ts">
import request from '@/utils/request'
import { onMounted, ref } from 'vue'
import { useUserInfoStore } from '@/stores/user'
import type { FileNode } from './type'

const userStore = useUserInfoStore()

defineProps<{
  readonlyMode: boolean
  setReadonlyMode: (tree: FileNode) => void
}>()

type ListItem = {
  id: number
  name: string
  tree: FileNode
  user_id: number
}

const list = ref<ListItem[] | null>(null)
const selectedItem = ref<ListItem | null>(null)

const getDirectory = async () => {
  const userId = userStore.userInfo.userId
  if (userId === undefined) {
    throw new Error('用户未登录')
  }

  try {
    const res = await request<{ list: ListItem[] }>({
      url: '/file/file/fileTree',
      method: 'GET',
      params: {
        userId: userId,
      },
    })
    if (res.success) {
      // console.log('获取目录成功:', res.data)
      list.value = res.data.list
    }
  } catch (error) {
    console.log('获取目录失败:', error)
  }
}

defineExpose({
  getDirectory,
})

onMounted(() => {
  getDirectory()
})
</script>

<template>
  <div class="directory">
    <div
      v-for="item in list"
      :key="item.id"
      class="item"
      :class="{ active: selectedItem?.id === item.id && readonlyMode }"
      @click="
        () => {
          selectedItem = item
          setReadonlyMode(item.tree)
        }
      "
    >
      {{ item.name }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.directory {
  display: flex;
  gap: 10px;

  .item {
    padding: 6px 12px;
    border-radius: 10px;
    font-size: 14px;
    cursor: pointer;
    background-color: var(--light-border-color-2);
    color: var(--text-color-1);
    transition: all 0.2s ease;
    white-space: nowrap;

    &.active {
      background-color: var(--theme-color-1);
      color: var(--normal-bgc);
    }
  }
}
</style>
