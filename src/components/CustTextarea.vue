<script setup>
import { ref, watch, onMounted } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.bubble.css'
import Delta from 'quill-delta'

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
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'update:height'])

const editorRef = ref(null)
let quillInstance = null

// 转义函数：将 < > 等转成 &lt; &gt;
const escapeHtml = (html) => {
  if (!html) return ''
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 初始化Quill编辑器
onMounted(() => {
  if (!editorRef.value) return
  
  quillInstance = new Quill(editorRef.value, {
    theme: 'bubble',
    placeholder: props.placeholder,
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
        ],
        beforePaste: (clipboardData) => {
          const items = clipboardData.items;
          let hasImage = false;

          console.log('clipboardData', clipboardData)

          // 检查是否包含图片
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.includes('image/')) {
              hasImage = true;
              break;
            }
          }

          if (hasImage) {
            alert('不支持粘贴图片！');
            return false; // 返回 false 完全阻止粘贴
          }

          // 只保留纯文本（清除格式）
          const text = clipboardData.getData('text/plain');
          // 返回新的剪贴板数据（只含纯文本）
          return new Blob([text], { type: 'text/plain' });
        },
      }
    }
  })


  // 设置初始值
  if (props.modelValue) {
    // 先进行HTML转义处理
    const escapedText = escapeHtml(props.modelValue)
    quillInstance.setText(escapedText)
  }

  // 监听编辑器内容变化
  quillInstance.on('text-change', () => {
    const plainText  = quillInstance.getText()

    const unescapedText = escapeHtml(plainText)
    // console.log(unescapedText)

    emit('update:modelValue', unescapedText)

    updateEditorHeight()
  })

  // quillInstance.root.addEventListener("paste", (event) => {
  //   console.log('paste', event)

  //   event.preventDefault()
    
  //   if (event.clipboardData && event.clipboardData.files.length > 0) {
  //     event.preventDefault(); // 阻止默认粘贴行为
  //     const files = event.clipboardData.files
  //   }
  // })

  // const editorElement = editorRef.value.querySelector('.ql-editor');
  
  // // 监听粘贴事件
  // editorElement.addEventListener('paste', (e) => {
  //   const items = e.clipboardData.items

  //   for (let i = 0; i < items.length; i++) {
  //     console.log("类型:", items[i].type) // 如 "image/png"
  //   }
    
  //   e.preventDefault()
    
  //   // 1. 获取纯文本内容
  //   const plainText = e.clipboardData.getData('text/plain')
  //   // console.log('剪贴板纯文本:', plainText);
    
  //   // 2. 获取HTML内容
  //   const htmlContent = e.clipboardData.getData('text/html')
  //   // console.log('剪贴板HTML内容:', htmlContent);
    
  //   // 如需自定义处理粘贴，可以阻止默认行为并手动插入
  //   // e.preventDefault();
  //   // quillInstance.insertText(quillInstance.getSelection().index, plainText);
  // })
})

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
    console.log('文本高度:', scrollHeight)
    
    // 暴露高度给父组件
    emit('update:height', scrollHeight)
  }
}

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
}
</style>