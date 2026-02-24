<script setup lang="ts">
import { createMarkdown } from '@/utils/render'
import { ref, watch } from 'vue'
import '@/styles/md.scss'

const editorRef = ref<HTMLElement>()

const props = defineProps({
  fileContent: {
    type: String,
    default: '',
  },
})

const md = ref()

watch(
  () => props.fileContent,
  (newContent) => {
    if (newContent) {
      md.value = createMarkdown(newContent, editorRef)
    }
  }
)
</script>

<template>
  <div ref="editorRef" class="editor-wapper">
    <div v-if="md" class="edit-container" tabindex="0">
      <component :is="md.root" />
    </div>
    <textarea ref="imeTextarea" class="ime-textarea" spellcheck="false"></textarea>
    <div class="cursor-layer"></div>
  </div>
</template>

<style scoped lang="scss">
.editor-wapper {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
