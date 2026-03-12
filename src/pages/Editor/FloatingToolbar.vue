<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { KeyCharTypes } from '@/utils/render'
import type { SourceInfo } from './index.vue'
import type { FileNode } from './type'

defineProps<{
  selectedFile: FileNode | null
  currSource: SourceInfo | null
  readonlyMode: boolean
  handleSetStyle: (style: KeyCharTypes) => void
}>()

const toolbarStyle = ref({
  position: 'fixed' as const,
  left: '50%',
  bottom: '30px',
  transform: 'translateX(-50%)',
})

const updatePosition = () => {
  const fileContent = document.querySelector('.file-content') as HTMLElement
  if (fileContent) {
    setTimeout(() => {
      const rect = fileContent.getBoundingClientRect()
      toolbarStyle.value = {
        position: 'fixed',
        left: `${rect.left + rect.width / 2}px`,
        bottom: `${window.innerHeight - rect.bottom + 10}px`,
        transform: 'translateX(-50%)',
      }
    })
  }
}

onMounted(() => {
  updatePosition()
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition)
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition)
})
</script>

<template>
  <div
    v-if="selectedFile && currSource && currSource.type === 'text' && !readonlyMode"
    class="floating-toolbar"
    :style="toolbarStyle"
  >
    <div class="toolbar-item" @click="handleSetStyle('strong')">
      <img src="../../assets/svgs/md-strong.svg" alt="" />
    </div>
    <div class="toolbar-item" @click="handleSetStyle('emphasis')">
      <img src="../../assets/svgs/md-emphasis.svg" alt="" />
    </div>
    <div class="toolbar-item" @click="handleSetStyle('inlineCode')">
      <img src="../../assets/svgs/md-inline-code.svg" alt="" />
    </div>
    <div class="toolbar-item" @click="handleSetStyle('blockCode')">
      <img src="../../assets/svgs/md-block-code.svg" alt="" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.floating-toolbar {
  display: flex;
  gap: 12px;
  padding: 10px 15px;
  background-color: var(--primary-bgc);
  border: 1px solid var(--light-border-color-1);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;

  .toolbar-item {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    background-color: var(--light-border-color-2);
    color: var(--text-color-1);
    transition: all 0.2s ease;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover {
      background-color: var(--btn-locked);
      color: var(--normal-bgc);
    }

    img {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }
  }
}
</style>
