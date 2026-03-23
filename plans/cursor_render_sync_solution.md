# 光标渲染与 MD 渲染时差问题解决方案

## 问题现象

当文本量很大时，Worker 中 `remark().parse()` 耗时较长（如 80ms+），光标渲染和 Markdown 渲染出现时差，表现为：

- 用户输入后，光标位置闪烁或跳到错误位置
- 输入字符后短暂看不到新字符
- 光标和实际输入位置不一致

## 问题根源分析

### 当前数据流

```
用户输入
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. handleInsert() 立即执行                                   │
│    - source.value 更新（同步）                               │
│    - cursorOffset 更新（同步）                               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. watch 触发，发送任务到 Worker                             │
│    - worker.postMessage({ id, markdown })                   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Worker 解析（异步，耗时 80ms+）                           │
│    - remark().parse(markdown)                               │
│    - self.postMessage({ id, ast })                          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼ (等待 80ms+)
┌─────────────────────────────────────────────────────────────┐
│ 4. Worker 返回结果                                           │
│    - ast.value = resultAst                                  │
│    - 触发 preprocessedAst 重新计算                           │
│    - 触发 root() 重新渲染                                    │
└─────────────────────────────────────────────────────────────┘
```

### 核心矛盾

| 状态 | 更新时机 | 数据来源 |
|------|----------|----------|
| `source.value` | 立即（同步） | 用户输入 |
| `cursorOffset` | 立即（同步） | 用户输入位置 |
| `ast.value` | 延迟（异步） | Worker 返回 |

**问题**：渲染时 `checkCursorInNode()` 需要同时使用 `cursorOffset` 和 AST 节点的 `position`：

```typescript
// renderer.ts
function checkCursorInNode(node: Node) {
  const { start, end } = deconstructPosition(node)  // 来自 AST
  return cursorOffset.value >= 0 && cursorOffset.value >= start && cursorOffset.value <= end
}
```

在 Worker 解析期间：
- `cursorOffset` 已经是新的（基于新输入）
- `ast.value` 还是旧的（基于旧文本）
- 节点的 `position` 与 `cursorOffset` 不匹配
- 导致光标渲染位置错误

### 时序图

```
时间轴 ──────────────────────────────────────────────────────────▶

用户输入:     ──┬──
               │
               ▼
source:       [新值] ─────────────────────────────────────────────▶
               │
               ▼
cursorOffset: [新位置] ───────────────────────────────────────────▶
               │
               ▼
Worker任务:   [发送] ─────────────────────────────────────────────▶
               │
               │        ┌─ Worker 解析中 (80ms) ─┐
               │        │                        │
               ▼        ▼                        ▼
ast.value:    [旧AST] ────────────────────────── [新AST]
               │                                   │
               ▼                                   ▼
渲染:         [光标位置错误]                       [光标位置正确]
              (cursorOffset 新, position 旧)
```

## 解决方案

### 方案一：乐观更新（推荐）

**思路**：在等待 Worker 返回期间，使用同步解析作为临时结果，保证 `ast.value` 与 `source.value` 同步更新。

**实现**：

```typescript
// index.ts
const ast = ref<Root | null>(null)
const isWorkerPending = ref(false)

// 监听 source 变化
watch(
  [() => source.value, () => loadedLangs.value.length],
  ([val]) => {
    const markdown = val
    const taskId = ++currentTaskId
    
    // 乐观更新：立即同步解析
    if (markdown.length < 50000) { // 小文本同步解析
      try {
        ast.value = remark().parse(markdown) as Root
      } catch (e) {
        console.error('Sync parse error:', e)
      }
    }
    
    // 同时发送 Worker 任务（用于大文本或后台验证）
    isWorkerPending.value = true
    worker.postMessage({ id: taskId, markdown })
  },
  { immediate: true }
)

// Worker 返回时更新
worker.onmessage = (event) => {
  const { id, ast: resultAst, error } = event.data
  
  if (id !== currentTaskId) return
  
  isWorkerPending.value = false
  
  if (!error) {
    ast.value = resultAst
  }
}
```

**优点**：
- 实现简单，改动小
- 小文本无延迟，大文本有 Worker 兜底

**缺点**：
- 小文本同步解析仍会阻塞主线程（但耗时短）
- 可能出现两次渲染（同步 + Worker）

---

### 方案二：增量解析

**思路**：只解析变化的部分，而不是全量解析。

**实现思路**：

```typescript
// 维护上一次的 AST
let previousAst: Root | null = null
let previousSource: string = ''

// 计算变化区域
function getChangedRegion(oldSource: string, newSource: string, cursorOffset: number) {
  // 找到变化开始和结束位置
  let start = 0
  let end = newSource.length
  
  for (let i = 0; i < Math.min(oldSource.length, newSource.length); i++) {
    if (oldSource[i] !== newSource[i]) {
      start = i
      break
    }
  }
  
  // 返回需要重新解析的区域
  return { start, end }
}

// 增量更新 AST
function incrementalUpdateAst(
  previousAst: Root,
  previousSource: string,
  newSource: string,
  changedRegion: { start: number; end: number }
): Root {
  // 找到受影响的节点
  // 只重新解析这些节点
  // 合并回原 AST
}
```

**优点**：
- 解析速度快，只处理变化部分
- 主线程阻塞时间短

**缺点**：
- 实现复杂，需要处理各种边界情况
- remark 不支持增量解析，需要自己实现

---

### 方案三：光标位置独立管理

**思路**：光标渲染不依赖 AST 的 position，而是基于 source 的 offset 直接计算 DOM 位置。

**当前问题代码**：

```typescript
// renderer.ts - 当前实现
function checkCursorInNode(node: Node) {
  const { start, end } = deconstructPosition(node)  // 依赖 AST position
  return cursorOffset.value >= start && cursorOffset.value <= end
}
```

**改进方案**：

```typescript
// 新增：光标位置管理器
function createCursorManager(source: Ref<string>, editorRef: EditorRef) {
  // 直接从 source offset 计算 DOM 位置
  const updateCursorPosition = (offset: number) => {
    const editContainer = editorRef.value?.querySelector('.edit-container')
    const cursorLayer = editorRef.value?.querySelector('.cursor-layer')
    const imeTextarea = editorRef.value?.querySelector('.ime-textarea')
    
    if (!editContainer || !cursorLayer) return
    
    // 遍历所有 .md-text 元素，找到包含 offset 的元素
    const textElements = editContainer.querySelectorAll('.md-text')
    
    for (const el of textElements) {
      const node = domToNode.get(el as HTMLElement)
      if (!node) continue
      
      const start = node.position.start.offset
      const end = node.position.end.offset
      
      if (offset >= start && offset <= end) {
        const localOffset = offset - start
        // 计算光标位置...
        break
      }
    }
  }
  
  return { updateCursorPosition }
}
```

**问题**：仍然依赖 `domToNode`，而 `domToNode` 是在渲染时建立的，需要先有正确的 AST 渲染结果。

---

### 方案四：双缓冲 + 预测渲染

**思路**：维护两个 AST 缓冲区，一个用于当前渲染，一个用于后台解析。同时预测用户输入对 AST 的影响。

```typescript
// 双缓冲
const astFront = ref<Root | null>(null)  // 前台缓冲，用于渲染
const astBack = ref<Root | null>(null)   // 后台缓冲，Worker 更新

// 预测更新：用户输入时立即更新前台缓冲
function predictAstUpdate(ast: Root, offset: number, insertedText: string): Root {
  // 简单预测：找到受影响的节点，调整其 position
  // 对于简单输入（单字符），可以直接调整 position
}

// watch source
watch(source, (newSource, oldSource) => {
  // 1. 计算差异
  const diff = computeDiff(oldSource, newSource)
  
  // 2. 预测更新前台缓冲
  if (astFront.value && diff.type === 'insert' && diff.text.length <= 2) {
    astFront.value = predictAstUpdate(astFront.value, diff.offset, diff.text)
  }
  
  // 3. 发送 Worker 任务更新后台缓冲
  worker.postMessage({ id: ++taskId, markdown: newSource })
})

// Worker 返回时，交换缓冲区
worker.onmessage = (e) => {
  if (e.data.id === currentTaskId) {
    astFront.value = e.data.ast
  }
}
```

**优点**：
- 光标和渲染始终同步
- Worker 结果作为校验

**缺点**：
- 预测逻辑复杂，可能不准确
- 需要处理预测失败的情况

---

## 推荐方案

**采用方案一（乐观更新）+ 方案三（光标独立管理）的组合**：

### 实现步骤

#### Step 1: 添加同步解析阈值

```typescript
// index.ts
const SYNC_PARSE_THRESHOLD = 10000 // 10KB 以下同步解析

watch(
  [() => source.value, () => loadedLangs.value.length],
  ([val]) => {
    const markdown = val
    const taskId = ++currentTaskId
    
    // 小文本：同步解析，保证实时性
    if (markdown.length < SYNC_PARSE_THRESHOLD) {
      try {
        ast.value = remark().parse(markdown) as Root
      } catch (e) {
        console.error('Sync parse error:', e)
      }
    }
    
    // 大文本：发送 Worker 任务
    worker.postMessage({ id: taskId, markdown })
  },
  { immediate: true }
)
```

#### Step 2: Worker 结果作为校验

```typescript
worker.onmessage = (event) => {
  const { id, ast: resultAst, error } = event.data
  
  if (id !== currentTaskId) return
  
  // 大文本时才更新（小文本已同步解析）
  if (source.value.length >= SYNC_PARSE_THRESHOLD && !error) {
    ast.value = resultAst
  }
}
```

#### Step 3: 添加解析状态指示（可选）

```typescript
// 显示解析状态
const parseStatus = ref<'sync' | 'pending' | 'done'>('done')

// watch 中
if (markdown.length >= SYNC_PARSE_THRESHOLD) {
  parseStatus.value = 'pending'
} else {
  parseStatus.value = 'sync'
}

// worker.onmessage 中
parseStatus.value = 'done'
```

### 预期效果

| 文本大小 | 解析方式 | 主线程阻塞 | 用户体验 |
|----------|----------|------------|----------|
| < 10KB | 同步解析 | < 10ms | 流畅 |
| 10KB - 50KB | 同步 + Worker | 10-50ms | 轻微延迟 |
| > 50KB | Worker 为主 | ~0ms | 有延迟但可用 |

---

## 备选优化

### 1. Web Worker 池

对于超大文件，可以使用 Worker 池并行解析不同区域：

```typescript
const workerPool = [
  new Worker(...),
  new Worker(...),
  new Worker(...),
]

// 分片解析
function parseInChunks(markdown: string) {
  const chunks = splitMarkdown(markdown)
  return Promise.all(chunks.map((chunk, i) => {
    return sendToWorker(workerPool[i % workerPool.length], chunk)
  }))
}
```

### 2. 虚拟滚动

对于超大文档，只渲染可视区域：

```typescript
// 只渲染可视区域的节点
const visibleNodes = computed(() => {
  const { scrollTop, clientHeight } = scrollInfo.value
  return preprocessedAst.value?.children.filter(node => {
    return isNodeVisible(node, scrollTop, clientHeight)
  })
})
```

### 3. requestIdleCallback

在空闲时间预解析：

```typescript
requestIdleCallback(() => {
  // 预解析可能需要的区域
  preParseNearbyContent()
})
```

---

## 总结

| 方案 | 复杂度 | 效果 | 推荐场景 |
|------|--------|------|----------|
| 乐观更新 | 低 | 好 | 通用推荐 |
| 增量解析 | 高 | 最好 | 超大文件 |
| 光标独立 | 中 | 中 | 辅助方案 |
| 双缓冲 | 高 | 好 | 复杂场景 |

**建议**：先实现方案一（乐观更新），根据实际效果决定是否需要进一步优化。
