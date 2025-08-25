<script setup>
import { ref, onMounted, computed } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.bubble.css'
import Delta from 'quill-delta'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  height: {
    type: Number,
    default: 0
  },
  funcStatus: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue', 'update:height'])

const editorRef = ref(null)
let quillInstance = null

// 匹配功能的模式
const matchPatterns = computed(() => {
  return chatStore.FUNC_TYPE.map(item => {
    if (item === '标准') {
      return {
        regex: /^$/, // 匹配空字符串
        style: { color: 'inherit', bold: false }
      }
    } else {
      return {
        regex: new RegExp(`^\\s*${item.replace('+', '\\+')}`), // 转义特殊字符（如 +）
        style: { color: 'var(--light-blue-color)', bold: true }
      }
    }
  })
})

// 初始化Quill编辑器
onMounted(() => {
  if (!editorRef.value) return
  
  quillInstance = new Quill(editorRef.value, {
    theme: 'bubble',
    placeholder: '点击 Enter 回答问题',
    modules: {
      toolbar: false, // 禁用工具栏
      clipboard: {
        matchVisual: false, // 禁用视觉粘贴
        matchers: [
          [Node.ELEMENT_NODE, (node, delta) => {
            // 提取纯文本
            const text = delta.reduce((acc, op) => {
              if (typeof op.insert === 'string') {
                acc += op.insert
              }
              return acc
            }, '')

            // 返回纯文本Delta
            return new Delta().insert(text)
          }]
        ]
      }
    }
  })
  
  // 设置初始值
  if (props.modelValue) {
    // 先进行HTML转义处理
    const escapedText = props.modelValue
    quillInstance.setText(props.modelValue)
  }

  // 监听编辑器内容变化
  quillInstance.on('text-change', (delta, oldDelta, source) => {
    if (source === 'api') return

    const plainText = quillInstance.getText()

    if (plainText.trim() === '') {
      emit('update:modelValue', '')
      updateEditorHeight()
      return
    }

    // 清除样式
    clearStyle(quillInstance)

    // 匹配特定样式
    matchText(plainText)

    emit('update:modelValue', plainText)

    updateEditorHeight()
  })
  // quillInstance.keyboard.addBinding({ key: 13 }, (range, context) => {
  //   console.log('按下了 Enter 键')
  //   // 阻止默认换行行为
  //   return false;
  // })
})

// 清除样式
const clearStyle = (instance) => {
  const length = instance.getLength()
  instance.formatText(0, length, { 'color': 'inherit', 'bold': false })
}

// 匹配特定字符, 修改其样式
const matchText = (text) => {
  const pattern = matchPatterns.value[chatStore.funcStatus]
  const match = text.match(pattern.regex)

  if (match) {
    quillInstance.formatText(
      0,
      match[0].length,
      {
        'color': pattern.style.color,
        'bold': pattern.style.bold
      }
    )
  } else {
    // 没有匹配的字符则将当前功能取消
    chatStore.funcStatus = 0
  }
}

// 更新编辑器高度
const updateEditorHeight = () => {
  if (!editorRef.value) return
  const innerTextarea = editorRef.value.querySelector('.ql-editor')

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

// 插入文本特定文本
const insertText = (text, position = 0) => {
  if (!quillInstance) return

  clearStyle(quillInstance)

  quillInstance.insertText(position, text)

  const textLenght = quillInstance.getLength()
  
  // 插入后将光标移到文本末尾
  quillInstance.setSelection(textLenght - 1, 0)

  matchText(text)
  updateEditorHeight()
}

const deleteText = (length, position = 0) => {
  quillInstance.deleteText(position, length)
}

const focus = () => {
  quillInstance.focus()
}

// 重置输入框
const resetForm = (length) => {
  deleteText(length, 0)
  chatStore.funcStatus = 0
  chatStore.customContent = ''
  updateEditorHeight()
}

// 暴露方法给父组件
defineExpose({
  insertText,
  deleteText,
  resetForm,
  focus
})
</script>

<template>
  <div class="quill-editor-container">
    <div ref="editorRef"></div>
  </div>
</template>

<style scoped lang="scss">
.quill-editor-container {
  /* 限制最大高度并启用滚动 */
  max-height: 210px;
  overflow-y: auto;
  
  :deep(.ql-editor) {
    padding: 0;
    line-height: 1.5;
    font-size: 16px;
    background-color: #fff;

    // placeholder
    &.ql-blank::before {
      color: var(--text-placeholder);
      font-style: normal;
      transform: translateX(-12px);
    }
  }

  :deep(.ql-code-block-container) {
    display: inline;
    background: transparent;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }

  // 清除代码块内元素样式
  :deep(.ql-code-block) {
    all: unset;
    display: inline;
  }

  // 更改光标颜色
  :deep(.ql-editor) {
    caret-color: var(--main-color);
  }

  @media (max-aspect-ratio: 1/1) {
    max-height: 120px;
  }
}
</style>