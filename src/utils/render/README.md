# Markdown 编辑器渲染引擎

## 概述

这是一个自研的类 Typora 所见即所得 Markdown 编辑器渲染引擎，基于 Vue 3 + Remark + Highlight.js 实现。支持实时编辑、语法高亮、代码块编辑、撤销重做等核心功能。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     Markdown Editor                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Editor    │  │  Selector   │  │     Renderer        │  │
│  │  (编辑核心)  │  │  (光标选区)  │  │    (渲染引擎)        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │             │
│         ▼                ▼                    ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   createMarkdown                     │   │
│  │              (核心工厂函数，整合各模块)                │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                │                    │             │
│         ▼                ▼                    ▼             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │InputHandler │  │   History   │  │   BlobUrlManager    │  │
│  │  (输入处理)  │  │  (历史栈)    │  │    (图片管理)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. createMarkdown - 核心入口

**文件**: `index.ts`

工厂函数，整合所有模块，创建 Markdown 编辑器实例。

```typescript
export function createMarkdown(
  input: string,                    // 初始 Markdown 内容
  editorRef: EditorRef,             // 编辑器容器 Ref
  options?: UseOptions              // 配置选项
): MarkDown
```

**返回对象**:
- `root: () => VNode` - 渲染根节点
- `source: Ref<string>` - Markdown 源文本
- `editor: Editor` - 编辑器实例
- `inputHandler: InputHandler` - 输入事件处理
- `cleanup: () => void` - 清理函数

**核心流程**:
1. 创建 DOM 到 AST 节点的映射 (`domToNode`)
2. 初始化选区管理器 (`selector`)
3. 初始化编辑器 (`editor`)
4. 初始化输入事件处理 (`inputHandler`)
5. 初始化代码高亮 (`hljs`)
6. 使用 Remark 解析 Markdown 为 AST
7. 预处理 AST（代码高亮、图片 URL 转换）
8. 渲染为 Vue VNode

### 2. createEditor - 编辑核心

**文件**: `edit.ts`

处理所有键盘输入、文本插入删除、快捷键操作。

**核心功能**:

| 功能 | 快捷键 | 说明 |
|------|--------|------|
| 撤销 | Ctrl+Z | 回退到上一个历史状态 |
| 重做 | Ctrl+Y | 恢复到下一个历史状态 |
| 插入代码块 | Ctrl+I | 插入 Markdown 代码块 |
| 插入粗体 | - | 插入 `** **` |
| 插入斜体 | - | 插入 `* *` |
| 插入行内代码 | - | 插入 `` ` ` `` |
| Tab | Tab | 插入两个空格 |
| 方向键 | ↑↓←→ | 移动光标 |

**关键方法**:
```typescript
type Editor = {
  source: Ref<string>              // 当前文本内容
  handleKeydown: (e: KeyboardEvent) => void
  handlePaste: (e: ClipboardEvent) => void
  handleInsert: (key: string) => void
  handleDelete: () => void
  handleCompositionUpdate: (startOffset: number, composingText: string) => void
  record: () => void               // 记录历史
  history: History                 // 历史栈
  handleInsertKeyChars: (type: KeyCharTypes) => void
}
```

### 3. createSelector - 光标选区管理

**文件**: `select.ts`

管理光标位置和文本选区，处理用户的选择操作。

**核心概念**:
- `cursorOffset`: 光标在文本中的绝对偏移量
- `position`: 选区的起始和结束偏移量
- `visualColumn`: 视觉列号（用于上下箭头导航）

**选区方向处理**:
```typescript
switch (direction) {
  case 'none':     // 点击设置光标
  case 'forward':  // 从前往后划选
  case 'backward': // 从后往前划选
}
```

### 4. createRenderer - 渲染引擎

**文件**: `renderer.ts`

将 AST 节点渲染为 Vue VNode，支持编辑模式和预览模式切换。

**渲染策略**:
- **光标在节点内**: 渲染为纯文本（可编辑）
- **光标在节点外**: 渲染为富文本（预览模式）

**支持的节点类型**:

| 类型 | 说明 | 编辑模式 |
|------|------|----------|
| paragraph | 段落 | 纯文本/富文本 |
| heading | 标题 | 纯文本/富文本 |
| code | 代码块 | 高亮显示/纯文本 |
| inlineCode | 行内代码 | 高亮显示/纯文本 |
| blockquote | 引用块 | 纯文本/富文本 |
| thematicBreak | 分隔线 | 纯文本/hr |
| emptyLine | 空行 | 特殊处理 |
| strong | 粗体 | 富文本 |
| emphasis | 斜体 | 富文本 |

**代码块特殊处理**:
```typescript
// 非编辑模式：使用 highlight.js 高亮
h('pre', { innerHTML: node.html })

// 编辑模式：渲染为纯文本，可编辑
renderPlainText(node, sliceTextFromSource(node), domToNode)
```

**光标同步**:
```typescript
// 使用浏览器原生 Selection API 同步光标位置
const sel = window.getSelection()
if (sel) {
  const range = document.createRange()
  range.setStart(el.firstChild, localOffset)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}
```

### 5. setupInputHandler - 输入事件处理

**文件**: `inputHandler.ts`

在 contenteditable 元素上监听输入事件，处理普通文本输入和 IME 组合输入。

**实现原理**:
1. 监听 `beforeinput` 事件，阻止浏览器原生 DOM 修改
2. 监听 `compositionstart` 标记 IME 组合开始
3. 监听 `compositionend` 完成组合输入，一次性写入最终文本
4. 监听 `keydown` 处理控制键（方向键、删除、Tab 等）
5. 监听 `paste` 处理粘贴操作

**事件处理**:
```typescript
// beforeinput: 始终阻止浏览器原生 DOM 修改
const onBeforeInput = (e: InputEvent) => {
  e.preventDefault()
  if (isComposing) return
  
  switch (inputType) {
    case 'insertText':
      editor.handleInsert(data)
      break
    case 'deleteContentBackward':
      editor.handleDelete()
      break
    // ...
  }
}

// compositionend: 一次性写入最终文本
const onCompositionEnd = (e: CompositionEvent) => {
  const finalText = e.data || ''
  if (finalText && compositionStartOffset !== null) {
    editor.handleCompositionUpdate(compositionStartOffset, finalText)
    editor.record()
  }
  isComposing = false
}
```

**设计要点**:
- `beforeinput` 始终调用 `preventDefault()`，确保所有 DOM 修改都通过 `source.value` 驱动
- IME 组合期间不更新 `source.value`，避免中间态导致的重复渲染
- 浏览器负责显示 IME 候选窗口，`compositionend` 时一次性写入最终文本

### 6. setupHistoryStack - 撤销重做

**文件**: `history.ts`

实现撤销重做功能，基于栈数据结构。

**数据结构**:
```typescript
type HistoryEntry = {
  source: string           // 文本内容
  position: {              // 选区位置
    startOffset: number
    endOffset: number
  }
  cursorOffset: number     // 光标位置
}
```

**操作**:
- `record()`: 记录当前状态
- `undo()`: 撤销 (Ctrl+Z)
- `redo()`: 重做 (Ctrl+Y)
- `reset()`: 重置到初始状态

### 7. createHljs - 代码高亮

**文件**: `hljs.ts`

基于 Highlight.js 的代码高亮模块，支持懒加载语言包。

**预注册语言**:
- JavaScript / TypeScript
- HTML / CSS
- Java / JSON
- Bash / Shell
- Vue

**懒加载语言**:
Rust、Go、C/C++、C#、PHP、Ruby、Swift、Kotlin、R、Matlab、SQL、YAML、Python

### 8. createBlobUrlManager - 图片管理

**文件**: `blobUrlManager.ts`

管理图片 URL 转换，支持将远程 URL 转换为本地 Blob URL。

```typescript
type BlobUrlManager = {
  parseUrlToBlob: (url: string) => string
  blobUrlMap: Map<string, string>  // 原始 URL -> Blob URL
  cleanup: () => void               // 释放 Blob URL
}
```

### 9. AST 类型扩展

**文件**: `ast.ts`

扩展 mdast 类型定义，添加自定义属性。

```typescript
// 扩展 mdast 类型
declare module 'mdast' {
  interface RootContentMap {
    emptyLine: EmptyLine  // 空行类型
  }

  interface Code {
    html?: string         // 高亮后的 HTML
    children: [Text & { nodeId: number }]
  }
}
```

## 数据流

```
用户输入
   │
   ▼
┌─────────────────┐
│ InputHandler    │ (beforeinput + compositionend)
└──────┬──────────┘
       │
       ▼
┌─────────────┐
│ Editor 处理  │ (插入/删除文本)
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ 更新 source  │────▶│ 记录 History │
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│ Remark 解析  │ (Markdown → AST)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 预处理 AST   │ (代码高亮、图片处理)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 渲染 VNode   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Selection   │ (同步浏览器光标)
└─────────────┘
```

## 使用示例

```vue
<template>
  <div ref="editorRef" class="editor-wapper">
    <div v-if="md" class="edit-container" :contenteditable="!readonly">
      <component :is="md.root" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'
import { createMarkdown, type MarkDown } from '@/utils/render'

const editorRef = ref<HTMLElement>()
const md = ref<MarkDown>()

watch(
  () => props.text,
  (source) => {
    md.value = createMarkdown(source, editorRef, {
      isReadonly: false,
      parseUrlToBlob: (url) => convertToBlobUrl(url)
    })
  }
)

onUnmounted(() => {
  md.value?.cleanup()
})
</script>
```

## 性能优化

1. **响应式控制**: 使用 `editingNodeMap` 精确控制代码块的编辑状态，避免全量重新渲染
2. **懒加载语言**: 代码高亮语言包按需加载
3. **Blob URL 缓存**: 图片 URL 转换结果缓存，避免重复请求
4. **历史栈限制**: 自动清理过期的历史记录

## 注意事项

1. **光标唯一性**: 通过 `cursorRendered` 标志确保只有一个光标位置
2. **选区同步**: 需要同步维护 `cursorOffset` 和 `position` 两个状态
3. **代码块编辑**: 进入编辑模式时清除高亮 HTML，退出时重新高亮
4. **IME 处理**: `beforeinput` 必须始终 `preventDefault()`，避免浏览器原生 DOM 修改与 `source.value` 驱动的渲染冲突
5. **光标同步**: VNode 重新渲染后，使用 `window.getSelection().addRange()` 同步浏览器原生光标位置

## 扩展建议

- [ ] 添加表格编辑支持
- [ ] 实现拖拽排序
- [ ] 添加数学公式支持 (KaTeX)
- [ ] 实现分屏预览模式
- [ ] 添加 Markdown 语法提示
- [ ] 实现协同编辑 (Operational Transform)
