# 方案 4：使用 requestIdleCallback 替代 Worker

## 问题原因

Web Worker 环境无法访问 DOM API，而 `remark` 或其依赖在 Vite 预打包时引入了 `document` 访问，导致 Worker 报错。

## 解决方案

放弃 Web Worker，使用 `requestIdleCallback` 在浏览器空闲时间执行解析，避免阻塞用户交互。

## 核心思路

```
┌─────────────────────────────────────────────────────────────┐
│                 requestIdleCallback 流程                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  用户输入 → 防抖(50ms) → 等待浏览器空闲 → 解析 AST            │
│                              │                              │
│                              ▼                              │
│                    浏览器空闲时执行                           │
│                    (不阻塞动画/交互)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 实施步骤

### Step 1: 修改 index.ts

移除 Worker 相关代码，改用 `requestIdleCallback`：

```typescript
import { computed, h, ref, watch, type Ref, type VNode } from 'vue'
import { remark } from 'remark'
import { createSelector, type Position } from './select'
import { createEditor, type Editor } from './edit'
import { isHTMLElement } from './utils/general'
import { createRenderer, preprocessAst } from './renderer'
import type { Root } from 'mdast'
import type { Node } from './ast'
import { setupIme, type Ime } from './ime'
import { createBlobUrlManager, type ParseUrlToBlob } from './blobUrlManager'
import { createHljs } from './hljs'

export function createMarkdown(
  input: string,
  editorRef: EditorRef,
  options?: UseOptions
): MarkDown {
  // ... 前面的初始化代码保持不变 ...

  const ast = ref<Root | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let idleCallbackId: number | null = null
  const DEBOUNCE_MS = 50

  const parseMarkdown = (markdown: string) => {
    try {
      ast.value = remark().parse(markdown) as Root
    } catch (e) {
      console.error('Parse error:', e)
    }
  }

  watch(
    [() => source.value, () => loadedLangs.value.length],
    ([val]) => {
      const markdown = val as string

      // 清除之前的定时器和空闲回调
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      if (idleCallbackId !== null) {
        cancelIdleCallback(idleCallbackId)
      }

      // 防抖 + 空闲回调
      debounceTimer = setTimeout(() => {
        // 使用 requestIdleCallback 在浏览器空闲时解析
        idleCallbackId = requestIdleCallback(
          () => parseMarkdown(markdown),
          { timeout: 100 } // 最多等待 100ms，确保不会无限延迟
        )
      }, DEBOUNCE_MS)
    },
    { immediate: true }
  )

  // ... 后续代码保持不变 ...

  const cleanup = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    if (idleCallbackId !== null) {
      cancelIdleCallback(idleCallbackId)
    }
    ime.cleanupImeListener()
    blobUrlManager.cleanup()
  }

  return {
    root,
    source,
    editor,
    ime,
    cleanup,
  }
}
```

### Step 2: 添加 requestIdleCallback 类型声明（如需要）

如果 TypeScript 报错，在 `src/env.d.ts` 或全局类型文件中添加：

```typescript
interface IdleDeadline {
  didTimeout: boolean
  timeRemaining: () => number
}

declare function requestIdleCallback(
  callback: (deadline: IdleDeadline) => void,
  options?: { timeout?: number }
): number

declare function cancelIdleCallback(id: number): void
```

## requestIdleCallback 说明

| 参数 | 说明 |
|------|------|
| `callback` | 空闲时执行的回调函数 |
| `options.timeout` | 最大等待时间（ms），超时后强制执行 |

| 回调参数 | 说明 |
|----------|------|
| `deadline.didTimeout` | 是否因超时而执行 |
| `deadline.timeRemaining()` | 剩余空闲时间（ms） |

## 与 Worker 方案对比

| 特性 | Worker | requestIdleCallback |
|------|--------|---------------------|
| 主线程阻塞 | 完全不阻塞 | 空闲时执行，影响较小 |
| DOM API | 不可用 | 可用 |
| 兼容性 | 需要处理模块问题 | 原生支持 |
| 实现复杂度 | 中 | 低 |
| 大文本性能 | 更优 | 稍差 |

## 性能优化建议

对于超大文本（>100k），可以结合分片解析：

```typescript
const parseMarkdownChunked = (markdown: string) => {
  const chunkSize = 10000
  let offset = 0

  const parseChunk = (deadline: IdleDeadline) => {
    const start = performance.now()
    
    while (offset < markdown.length && 
           (deadline.timeRemaining() > 0 || deadline.didTimeout)) {
      // 分片处理逻辑
      offset += chunkSize
    }

    if (offset < markdown.length) {
      requestIdleCallback(parseChunk)
    } else {
      // 所有分片处理完成，执行最终解析
      ast.value = remark().parse(markdown) as Root
    }
  }

  requestIdleCallback(parseChunk)
}
```

## 验证方法

1. 打开浏览器控制台，确认无错误
2. 快速输入文本，观察是否有卡顿
3. 使用 Chrome DevTools Performance 面板，确认解析任务在空闲时段执行

## 注意事项

1. `requestIdleCallback` 的 `timeout` 参数很重要，确保解析不会无限延迟
2. 对于实时性要求高的场景，可以减小 `timeout` 值
3. Safari 兼容性需要确认，可能需要 polyfill
