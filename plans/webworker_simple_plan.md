# Web Worker 简化优化方案

## 问题背景

在 `index.ts` 中，`remark().parse()` 解析 100k 文本耗时约 80ms，阻塞主线程导致输入卡顿。

## 简化方案设计

采用**单 Worker + 任务取消**模式，不引入 Worker 池，降低复杂度。

```
┌─────────────────────────────────────────┐
│              主线程 (Main Thread)        │
├─────────────────────────────────────────┤
│                                         │
│  用户输入 ──▶ 防抖(50ms) ──▶ 发送解析任务  │
│                              │          │
│                              ▼          │
│  渲染 AST ◀── 接收结果 ◀── Web Worker    │
│                                         │
└─────────────────────────────────────────┘
```

## 核心机制

### 1. 单 Worker 实例

只创建一个 Worker，复用处理所有解析请求。

### 2. 任务取消

新输入到来时，丢弃旧任务结果，只渲染最新一次。

```typescript
// 伪代码
let currentTaskId = 0

function parse(markdown) {
  const taskId = ++currentTaskId // 递增任务ID

  worker.postMessage({ id: taskId, markdown })

  worker.onmessage = (e) => {
    if (e.data.id !== currentTaskId) return // 丢弃旧任务
    ast.value = e.data.ast // 只渲染最新结果
  }
}
```

### 3. 防抖处理

连续输入时延迟 50ms 发送解析请求。

## 实现步骤

### Step 1: 完善 Worker 文件

**文件**: `workers/remark.worker.ts`

```typescript
import { remark } from 'remark'
import type { Root } from 'mdast'

self.onmessage = (event: MessageEvent<{ id: number; markdown: string }>) => {
  const { id, markdown } = event.data

  try {
    const ast = remark().parse(markdown) as Root
    self.postMessage({ id, ast, error: null })
  } catch (error: any) {
    self.postMessage({ id, ast: null, error: error.message })
  }
}
```

### Step 2: 修改 index.ts

**文件**: `index.ts`

```typescript
import type { Root } from 'mdast'

// ... 其他导入 ...

export function createMarkdown(
  input: string,
  editorRef: EditorRef,
  options?: UseOptions
): MarkDown {
  // ... 原有初始化代码 ...

  const ast = ref<Root | null>(null)

  // 单 Worker 实例
  const worker = new Worker(new URL('./workers/remark.worker.ts', import.meta.url), {
    type: 'module',
  })

  // 任务ID管理
  let currentTaskId = 0

  // 防抖定时器
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const DEBOUNCE_MS = 50

  // Worker 消息处理
  worker.onmessage = (event: MessageEvent<{ id: number; ast: Root; error: string | null }>) => {
    const { id, ast: resultAst, error } = event.data

    // 只处理最新任务的结果
    if (id !== currentTaskId) return

    if (error) {
      console.error('Worker parse error:', error)
      // 降级：同步解析
      try {
        ast.value = remark().parse(source.value) as Root
      } catch (e) {
        console.error('Fallback parse error:', e)
      }
    } else {
      ast.value = resultAst
    }
  }

  worker.onerror = (error) => {
    console.error('Worker error:', error)
  }

  // 监听 source 变化，触发解析
  watch(
    [() => source.value, () => loadedLangs.value.length],
    ([val]) => {
      const markdown = val as string

      // 清除之前的防抖定时器
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      // 防抖：延迟发送解析任务
      debounceTimer = setTimeout(() => {
        const taskId = ++currentTaskId
        worker.postMessage({ id: taskId, markdown })
      }, DEBOUNCE_MS)
    },
    { immediate: true }
  )

  // ... preprocessedAst, root 等原有代码 ...

  // 清理函数
  const cleanup = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    worker.terminate() // 终止 Worker
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

### Step 3: 降级处理

Worker 失败时自动降级到同步解析：

```typescript
// 在 worker.onmessage 的 error 处理中
if (error) {
  console.warn('Worker failed, fallback to sync parse')
  ast.value = remark().parse(source.value) as Root
}
```

## 关键代码说明

### 任务取消机制

```typescript
let currentTaskId = 0

// 发送新任务时递增ID
const taskId = ++currentTaskId
worker.postMessage({ id: taskId, markdown })

// 接收结果时检查ID
worker.onmessage = (e) => {
  if (e.data.id !== currentTaskId) return // 旧任务结果，丢弃
  ast.value = e.data.ast
}
```

### 防抖实现

```typescript
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => source.value,
  (val) => {
    // 清除旧定时器
    if (debounceTimer) clearTimeout(debounceTimer)

    // 设置新定时器
    debounceTimer = setTimeout(() => {
      // 发送解析任务
    }, 50)
  }
)
```

## 预期效果

| 指标       | 优化前 | 优化后 |
| ---------- | ------ | ------ |
| 主线程阻塞 | 80ms   | ~0ms   |
| 输入响应   | 卡顿   | 流畅   |
| 实现复杂度 | -      | 低     |

## 注意事项

1. **Worker 路径**: Vite 中使用 `new URL('./workers/xxx.ts', import.meta.url)`
2. **类型导入**: Worker 中需要独立导入 `remark` 和 `mdast` 类型
3. **内存管理**: `cleanup()` 中调用 `worker.terminate()`
4. **降级策略**: Worker 失败时自动同步解析

## 与完整方案对比

| 特性       | 简化方案   | 完整方案(Worker池) |
| ---------- | ---------- | ------------------ |
| Worker数量 | 1个        | 多个复用           |
| 任务队列   | 无         | 有                 |
| 取消机制   | 任务ID过滤 | AbortController    |
| 适用场景   | 单编辑器   | 多编辑器实例       |
| 代码复杂度 | 低         | 中                 |
| 维护成本   | 低         | 中                 |

**推荐**: 当前项目只有一个编辑器实例，简化方案足够且更易维护。

## 实施步骤

1. [ ] 修改 `workers/remark.worker.ts` 添加解析逻辑
2. [ ] 修改 `index.ts` 集成 Worker
3. [ ] 测试大文本输入性能
4. [ ] 验证降级机制

**预计时间**: 2-3 小时
