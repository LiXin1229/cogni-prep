# 流式场景下 parseMarkdown 优化方案

## 问题分析

流式传输时，每次 SSE chunk 到达都会执行 `newText.content += json.content`，触发 Vue 响应式更新，导致模板重新渲染，每次渲染都对**整条消息的完整内容**调用 `parseMarkdown(chat.content)`。

`parseMarkdown` 的开销链路：

```
chat.content 变化 → 模板重渲染 → parseMarkdown(fullContent)
  → marked.parse(fullContent)          // Markdown → HTML
  → purifyText(html)                   // DOMPurify 第一次净化
  → createElement('div') + innerHTML   // 创建临时 DOM
  → querySelectorAll('pre') + 遍历     // 代码块处理（创建 header DOM 节点）
  → purifyText(tempDiv.innerHTML)      // DOMPurify 第二次净化
```

假设一条 AI 回复 500 字、3 个代码块，流式分 50 次到达，则：

- `marked.parse` 执行 50 次，后 49 次是浪费（每次都从头解析全部内容）
- `DOMPurify.sanitize` 执行 100 次（每次调用 parseMarkdown 内部两次）
- 临时 DOM 创建/查询/操作 50 次
- 代码块 hljs 高亮重复计算 50 × 3 = 150 次

## 优化方案

### 方案一：computed 缓存 + 增量拼接（推荐）

**核心思路**：缓存已解析的 HTML，每次只解析新增的 Markdown 片段，拼接已有 HTML。

**实现位置**：`stores/chat.ts` 中 ChatMapValue 增加 `parsedHtml` 字段

```typescript
// stores/types/chat.type.ts
interface ChatType {
  id: number
  content: string
  messageType: number
  parsedHtml?: string // 新增：缓存的 HTML
  lastParsedLength?: number // 新增：上次解析到的位置
}
```

```typescript
// stores/chat.ts — processBuffer 内部
parts.forEach((part) => {
  if (part.startsWith('data: ')) {
    const data = part.slice(6)
    if (data === '[DONE]') return
    const json: { content: string } = JSON.parse(data)
    newText.content += json.content

    // 增量解析：只解析新增部分
    const prevLen = newText.lastParsedLength || 0
    if (prevLen < newText.content.length) {
      const增量 = newText.content.slice(prevLen)
      newText.parsedHtml = (newText.parsedHtml || '') + parseMarkdownIncremental(增量)
      newText.lastParsedLength = newText.content.length
    }
  }
})
```

**增量解析函数**（需处理跨 chunk 的 Markdown 语法边界）：

```typescript
// utils/markdown.ts
export const parseMarkdownIncremental = (chunk: string): string => {
  // 简单策略：直接解析 chunk，接受可能的边界不完美
  // 复杂策略：检测 chunk 是否以未闭合语法结尾，延迟解析
  const html = marked(chunk)
  return purifyText(html as string)
}
```

**模板侧**：将 `v-html="parseMarkdown(chat.content)"` 改为 `v-html="chat.parsedHtml"`，流式期间直接读缓存，不再调用 `parseMarkdown`。

**优点**：

- 解析量从 O(n²) 降为 O(n)
- 模板侧零计算开销
- 实现相对简单

**缺点**：

- 增量解析存在 Markdown 边界问题（如代码块跨 chunk、加粗语法跨 chunk），可能导致短暂的渲染闪烁
- 需要在流式结束时做一次全量重解析修正

**边界问题修正**：流结束时用全量 `parseMarkdown` 覆盖 `parsedHtml`：

```typescript
if (done) {
  if (buffer) processBuffer(buffer, true)
  // 全量重解析，修正增量解析的边界错误
  newText.parsedHtml = parseMarkdown(newText.content)
  newText.lastParsedLength = newText.content.length
  // ...
}
```

---

### 方案二：节流解析（最易实现）

**核心思路**：不改变解析方式，仅通过节流减少 `parseMarkdown` 调用频率。

**实现位置**：`ChatView/index.vue`

```typescript
// 使用 computed + 手动刷新标记
const parsedVersion = ref(0)
const parsedMap = new Map<number, string>()

const throttledParse = throttle(
  () => {
    parsedVersion.value++
  },
  200,
  { leading: true, trailing: true }
)

// watch content 变化，节流刷新
watch(
  () => chatStore.displayChat[chatStore.displayChat.length - 1]?.content,
  () => {
    if (isAutoToBottom.value) throttleToBottom()
    if (chatStore.sendState === 'streaming') throttledParse()
  }
)
```

模板侧用函数替代直接调用：

```html
<div v-html="getParsedHtml(chat)"></div>
```

```typescript
const getParsedHtml = (chat: ChatType) => {
  if (chatStore.sendState === 'streaming' && parsedMap.has(chat.id)) {
    return parsedMap.get(chat.id)!
  }
  const html = parseMarkdown(chat.content)
  parsedMap.set(chat.id, html)
  return html
}
```

**优点**：

- 改动最小，不影响现有逻辑
- 节流到 200ms，调用次数从 50 次降到约 15 次

**缺点**：

- 仍有重复解析，只是频率降低
- 用户看到的文字更新会有轻微延迟感

---

### 方案三：Web Worker 离线解析

**核心思路**：将 `parseMarkdown` 放到 Web Worker 中执行，避免阻塞主线程。

**实现位置**：新建 `src/utils/render/workers/markdown.worker.ts`

```typescript
// workers/markdown.worker.ts
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
// ... hljs 配置

self.onmessage = (e: MessageEvent<{ id: number; content: string }>) => {
  const { id, content } = e.data
  const html = marked(content)
  self.postMessage({ id, html })
}
```

```typescript
// stores/chat.ts
const mdWorker = new Worker(new URL('@/utils/render/workers/markdown.worker.ts', import.meta.url), {
  type: 'module',
})

// 流式更新时发送给 Worker
mdWorker.postMessage({ id: chatId, content: newText.content })

// 接收解析结果
mdWorker.onmessage = (e) => {
  const { id, html } = e.data
  // 更新对应 chat 的 parsedHtml
}
```

**优点**：

- 完全不阻塞主线程，UI 流畅度最佳
- 解析计算与渲染解耦

**缺点**：

- Worker 中无法使用 DOM API（`document.createElement`、`DOMPurify`），需重构 `parseMarkdown` 的代码块处理逻辑
- Worker 通信有序列化开销
- 需处理 Worker 生命周期管理
- 实现复杂度高

**可行性**：当前 `parseMarkdown` 内部使用了 `document.createElement` 创建临时 DOM 处理代码块头部，这部分需要改为字符串操作或后处理。`DOMPurify` 也依赖 DOM，需在主线程做或在 Worker 中引入 `linkedom` 等库模拟 DOM。

---

### 方案四：双缓冲区策略（增量 + 延迟合并）

**核心思路**：维护两个缓冲区——「已确认 HTML」和「待确认片段」，用 debounce 合并待确认片段。

```typescript
interface ParseState {
  confirmedHtml: string // 已确认的完整 HTML
  pendingMarkdown: string // 待合并的 Markdown 片段
  lastConfirmedEnd: number // 已确认的 content 长度
}

const parseState = reactive(new Map<number, ParseState>())
```

流式更新时：

```typescript
// 每次新 chunk 到达
const state = parseState.get(chatId)!
state.pendingMarkdown += newChunk
state.lastConfirmedEnd = content.length

// debounce 200ms 合并
debouncedMerge(chatId)
```

合并函数：

```typescript
const debouncedMerge = debounce((chatId: number) => {
  const state = parseState.get(chatId)!
  const html = parseMarkdown(state.confirmedHtml + state.pendingMarkdown)
  state.confirmedHtml = html
  state.pendingMarkdown = ''
}, 200)
```

**优点**：

- 解析次数可控（200ms 合并一次）
- 最终渲染结果是全量解析，不存在边界问题
- 比纯节流方案更优雅

**缺点**：

- 仍需在流式期间做全量解析（但频率低）
- 需要在 chat store 中管理额外的状态

---

## 方案对比

| 维度       | 方案一：增量拼接               | 方案二：节流解析 | 方案三：Web Worker          | 方案四：双缓冲区 |
| ---------- | ------------------------------ | ---------------- | --------------------------- | ---------------- |
| 性能提升   | ★★★★★                          | ★★★              | ★★★★★                       | ★★★★             |
| 实现难度   | ★★★                            | ★                | ★★★★★                       | ★★★              |
| 改动范围   | store + type + markdown + 模板 | 模板 + watch     | 新建 Worker + 重构 markdown | store + type     |
| 渲染正确性 | 流式期可能有闪烁               | 正确             | 正确（需重构 DOM 操作）     | 正确             |
| 主线程阻塞 | 低                             | 中               | 无                          | 低               |

## 推荐路径

**短期**：先实施方案二（节流解析），改动最小，立即见效。

**中期**：实施方案一（增量拼接 + 流结束全量修正），获得最佳性能。需处理 Markdown 边界问题：

- 代码块（` ``` `）跨 chunk
- 加粗/斜体（`**`/`*`）跨 chunk
- 列表项跨 chunk

边界问题的通用处理策略：在增量解析时，检测 chunk 末尾是否有未闭合的 Markdown 语法，如果有则将这部分暂存到待确认缓冲区，等下次 chunk 到来时拼接后再解析。

**长期**：如果消息内容越来越长（如 2000+ 字），考虑方案三（Web Worker），将 `parseMarkdown` 中的 DOM 操作替换为纯字符串操作后移入 Worker。
