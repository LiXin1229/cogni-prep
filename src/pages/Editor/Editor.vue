<script setup lang="ts">
import { createMarkdown, type MarkDown } from '@/utils/render'
import { onUnmounted, ref, watch } from 'vue'
import '@/styles/md.scss'
import type { FileNode } from './type'
import { parseUrlToBlob } from './utils/parseUrlToBlob'

const editorRef = ref<HTMLElement>()

const props = defineProps<{
  text: string
  currNode: FileNode | null
  readonly: boolean
}>()

const md = ref<MarkDown>()

watch(
  () => props.text,
  (source) => {
    md.value = createMarkdown(source, editorRef, {
      isReadonly: props.readonly,
      parseUrlToBlob: (url: string) => parseUrlToBlob(url, props.currNode),
    })
  }
)

defineExpose({
  md,
})

onUnmounted(() => {
  md.value?.cleanup()
})
</script>

<template>
  <div ref="editorRef" class="editor-wapper">
    <div v-if="md" class="edit-container" :contenteditable="!readonly">
      <component :is="md.root" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor-wapper {
  position: relative;
  width: 100%;
  // height: 100%;
}

.edit-container {
  outline: none;
}
</style>
