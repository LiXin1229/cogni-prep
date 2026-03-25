# Chat Store LRU 重构计划

## 背景

当前 `chat.ts` 使用 `chatMap`（响应式 Map）和 `chatQueue`（数组）两个结构来维护会话缓存，手动实现了 LRU 淘汰逻辑。可以用 `LRUCache` 类统一替代这两个结构。

## 当前实现分析

### 数据结构

```typescript
const chatMap = reactive(new Map<number, ChatMapValueTpye>())
const chatQueue: number[] = []
```

### LRU 淘汰逻辑

```typescript
const pushChatQueue = (currentSessionId: number, data: ChatMapValueTpye) => {
  const length = chatQueue.length
  if (length >= 5) {
    const removeId = chatQueue.shift() as number
    chatMap.get(removeId)?.controller?.abort()
    chatMap.delete(removeId)
  }
  chatMap.set(currentSessionId, data)
  chatQueue.push(currentSessionId)
}
```

### 使用场景统计

| 操作                                 | 位置                           | 说明               |
| ------------------------------------ | ------------------------------ | ------------------ |
| `chatMap.get(sessionId)`             | 多处                           | 获取当前会话数据   |
| `chatMap.has(sessionId)`             | `initDisplayChat`              | 检查会话是否已缓存 |
| `chatMap.set()`                      | `pushChatQueue`                | 添加新会话         |
| `chatMap.delete()`                   | `pushChatQueue`                | 淘汰旧会话         |
| `chatMap.get()?.controller?.abort()` | `pushChatQueue`, `abortStream` | 中断流式请求       |

## 可行性分析

### ✅ LRUCache 满足的需求

| 需求            | LRUCache 支持 | 说明                          |
| --------------- | ------------- | ----------------------------- |
| 响应式 Map      | ✅            | 内部 map 使用 `reactive` 包装 |
| LRU 淘汰        | ✅            | 自动淘汰最久未使用的数据      |
| 容量限制        | ✅            | 构造时指定 capacity=5         |
| number 类型 key | ✅            | `MapKey = string \| number`   |
| 泛型 value      | ✅            | `LRUCache<ChatMapValueTpye>`  |

### ⚠️ 需要处理的差异

| 差异                          | 解决方案                                |
| ----------------------------- | --------------------------------------- |
| 淘汰时需要 abort controller   | 重写或扩展 `remove` 方法，添加回调钩子  |
| `get()` 返回 `T \| undefined` | 当前代码已处理 undefined 情况，无需修改 |
| `has()` 方法                  | LRUCache 可通过 `map.has()` 实现        |

## 重构方案

### 方案一：直接替换（推荐）

直接用 LRUCache 替换 chatMap 和 chatQueue，在淘汰前手动处理 controller。

**优点**：

- 改动最小
- 逻辑清晰

**缺点**：

- 需要在 put 前手动检查是否即将淘汰

**实现**：

```typescript
import { LRUCache } from '@/utils/LRUCache'

const chatCache = new LRUCache<ChatMapValueTpye>(5)

const putChatCache = (sessionId: number, data: ChatMapValueTpye) => {
  if (chatCache.size >= chatCache.capacity) {
    const oldestKey = getOldestKey()
    chatCache.get(oldestKey)?.controller?.abort()
  }
  chatCache.put(sessionId, data)
}
```

### 方案二：扩展 LRUCache 添加淘汰回调

为 LRUCache 添加 `onEvict` 回调，在淘汰时自动执行清理逻辑。

**优点**：

- 更优雅，淘汰逻辑内聚
- 可复用于其他场景

**缺点**：

- 需要修改 LRUCache 类

**LRUCache 扩展**：

```typescript
export class LRUCache<T> {
  private onEvict?: (key: MapKey, value: T) => void

  constructor(capacity: number, onEvict?: (key: MapKey, value: T) => void) {
    this.map = reactive(new Map<MapKey, ListNode<T>>()) as Map<MapKey, ListNode<T>>
    this.capacity = capacity
    this.onEvict = onEvict
  }

  remove() {
    const head = this.list
    const first = head.next
    if (first && first.key !== undefined) {
      this.onEvict?.(first.key, first.val as T)
      this.map.delete(first.key)
      this.size--
    }
  }
}
```

**使用**：

```typescript
const chatCache = new LRUCache<ChatMapValueTpye>(5, (key, value) => {
  value.controller?.abort()
})
```

## 推荐方案：方案二

方案二更符合单一职责原则，将淘汰清理逻辑封装在 LRUCache 内部。

## 重构步骤

### 第一步：扩展 LRUCache

1. 添加 `onEvict` 回调参数
2. 在 `remove()` 方法中调用回调
3. 更新测试用例

### 第二步：重构 chat.ts

1. 导入 LRUCache
2. 创建 chatCache 实例，传入 abort 回调
3. 删除 chatMap 和 chatQueue
4. 替换所有 `chatMap.get()` 为 `chatCache.get()`
5. 替换 `chatMap.has()` 为 `chatCache.map.has()`
6. 删除 `pushChatQueue`，改用 `chatCache.put()`

### 第三步：验证

1. 运行测试确保 LRUCache 功能正常
2. 手动测试会话切换、淘汰、中断流式请求等功能

## 代码变更清单

### LRUCache.ts

```diff
export class LRUCache<T> {
  list = new ListNode<T>()
  tail: ListNode<T> = this.list
  map: Map<MapKey, ListNode<T>>
  size = 0
  capacity: number
+ private onEvict?: (key: MapKey, value: T) => void

- constructor(capacity: number) {
+ constructor(capacity: number, onEvict?: (key: MapKey, value: T) => void) {
    this.map = reactive(new Map<MapKey, ListNode<T>>()) as Map<MapKey, ListNode<T>>
    this.capacity = capacity
+   this.onEvict = onEvict
  }

  remove() {
    const head = this.list
    const first = head.next
    if (first) {
+     if (first.key !== undefined && first.val !== undefined) {
+       this.onEvict?.(first.key, first.val)
+     }
      // ... 其余逻辑
    }
  }
}
```

### chat.ts

```diff
+ import { LRUCache } from '@/utils/LRUCache'

- const chatMap = reactive(new Map<number, ChatMapValueTpye>())
- const chatQueue: number[] = []
+ const chatCache = new LRUCache<ChatMapValueTpye>(5, (key, value) => {
+   value.controller?.abort()
+ })

- const pushChatQueue = (currentSessionId: number, data: ChatMapValueTpye) => {
-   const length = chatQueue.length
-   if (length >= 5) {
-     const removeId = chatQueue.shift() as number
-     chatMap.get(removeId)?.controller?.abort()
-     chatMap.delete(removeId)
-   }
-   chatMap.set(currentSessionId, data)
-   chatQueue.push(currentSessionId)
- }
+ const putChatCache = (sessionId: number, data: ChatMapValueTpye) => {
+   chatCache.put(sessionId, data)
+ }

- chatMap.get(sessionId.value)
+ chatCache.get(sessionId.value)

- chatMap.has(currentSessionId)
+ chatCache.map.has(currentSessionId)

- chatMap.get(currentSessionId)?.controller?.abort()
+ chatCache.get(currentSessionId)?.controller?.abort()
```

## 风险评估

| 风险                | 影响 | 缓解措施                                     |
| ------------------- | ---- | -------------------------------------------- |
| 响应式行为差异      | 低   | LRUCache 的 map 已是响应式，行为一致         |
| get() 触发 LRU 更新 | 中   | get 会更新访问顺序，可能影响预期行为，需验证 |
| 淘汰时机变化        | 低   | 淘汰逻辑相同，只是封装位置不同               |

## 预期收益

1. **代码简化**：删除约 15 行手动 LRU 逻辑
2. **可维护性**：缓存逻辑集中在 LRUCache 类中
3. **可复用性**：LRUCache 可用于其他需要缓存的场景
4. **类型安全**：泛型支持更好的类型推导
