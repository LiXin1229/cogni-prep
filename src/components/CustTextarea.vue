<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  height: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue', 'update:height'])

const textareaRef = ref(null)

// 获取文本高度
const getTextHeight = async () => {
  await nextTick() // 等待DOM更新
  if (textareaRef.value) {
    const textarea = textareaRef.value
    const innerTextarea = textarea.querySelector('.el-textarea__inner')
    if (innerTextarea) {
      // 先重置高度，强制浏览器重新计算
      innerTextarea.style.height = '0'
      innerTextarea.style.height = 'auto'
      
      // 获取新的scrollHeight
      const scrollHeight = innerTextarea.scrollHeight
      // console.log('文本高度:', scrollHeight)
      
      // 暴露高度给父组件
      emit('update:height', scrollHeight)
    }
  }
  return 0
}

// 监听内容变化
watch(() => props.modelValue, () => {
  getTextHeight()
}, { immediate: true })
</script>

<template>
  <div class="cust-textarea" ref="textareaRef">
    <el-input
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
      v-bind="$attrs"
    />
  </div>
</template>

<style scoped lang="scss">
.cust-textarea {
  :deep(.el-textarea__inner) {
    overflow: auto;
  }
}
</style>
