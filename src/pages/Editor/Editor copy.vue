<script setup lang="ts">
import { createMarkdown, type MarkDown } from '@/utils/render'
import { onUnmounted, ref, watch } from 'vue'
import '@/styles/md.scss'

const editorRef = ref<HTMLElement>()

const props = defineProps<{
  fileSource: string
}>()

const md = ref<MarkDown>()

watch(
  () => props.fileSource,
  (source) => {
    if (source) {
      md.value = createMarkdown(source, editorRef)
      // console.log('createMarkdown: ', md.value)
    }
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
  <div v-if="md" class="edit-container" tabindex="0">
    <component :is="md.root" />
  </div>
  <textarea ref="imeTextarea" class="ime-textarea" spellcheck="false"></textarea>
  <div class="cursor-layer"></div>
</template>

<style scoped lang="scss">
.editor-wapper {
  position: relative;
  width: 100%;
  // height: 100%;
}
</style>
