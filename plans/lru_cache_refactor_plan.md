# ChatMap LRU 缓存改造方案

## 一、当前实现分析

### 1.1 现有代码结构

```typescript
// 当前使用 Map + 数组队列实现
const chatMap = reactive(new Map<number, ChatMapValueTpye>())
const chatQueue: number[] = []

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

### 1.2 现有实现的问题

| 问题               | 说明                                                                |
| ------------------ | ------------------------------------------------------------------- |
| **淘汰策略不精确** | 使用 FIFO（先进先出）策略，淘汰最早加入的会话，而非最久未使用的会话 |
| **访问顺序未更新** | 用户切换会话时，不会更新该会话在队列中的位置                        |
| **手动维护队列**   | 需要同时维护 Map 和 chatQueue 两个数据结构                          |

### 1.3 现有缓存使用场景

1. **写入时机**: `initDisplayChat` 获取聊天记录时
2. **读取时机**: `displayChat`、`sendState`、`nextState` 等 computed 属性
3. **淘汰时机**: 新会话加入时，若超过限制则淘汰
4. **中断时机**: 淘汰会话时需要 abort 正在进行的流式请求

---

## 二、LRU 缓存方案设计

### 2.1 核心思路

使用 `lru-cache` 库替换现有的 `Map + chatQueue` 实现，实现真正的 LRU（最近最少使用）淘汰策略。

### 2.2 LRU Cache 配置

```typescript
import { LRUCache } from 'lru-cache'

interface ChatMapValueTpye {
  chatList: ChatType[]
  backupChatList: ChatType[]
  sendState: SendStateType
  nextState: boolean
  controller: AbortController | null
}

const chatLRU = new LRUCache<number, ChatMapValueTpye>({
  max: 5, // 最大缓存数量
  ttl: 1000 * 60 * 30, // 30分钟过期时间（可选）
  allowStale: false, // 不允许返回过期数据
  updateAgeOnGet: true, // 读取时更新访问时间
  updateAgeOnHas: true, // has 检查时更新访问时间
  dispose: (value, key, reason) => {
    // 淘汰回调
    if (reason === 'evict' || reason === 'set') {
      value.controller?.abort() // 中断流式请求
    }
  },
})
```

---

## 三、详细改造方案

### 3.1 Store 改造代码

```typescript
// stores/chat.ts

import { LRUCache } from 'lru-cache'

export const useChatStore = defineStore('chat', () => {
  // ... 其他代码

  // LRU 缓存实例
  const chatLRU = new LRUCache<number, ChatMapValueTpye>({
    max: 5,
    updateAgeOnGet: true,
    updateAgeOnHas: true,
    dispose: (value, key, reason) => {
      if (reason === 'evict') {
        value.controller?.abort()
        console.log(`会话 ${key} 已被 LRU 淘汰`)
      }
    },
  })

  // 当前展示的聊天记录（响应式）
  const displayChat = computed(() => {
    const data = chatLRU.get(sessionId.value)
    return data?.chatList ?? []
  })

  // 发送状态（响应式）
  const sendState = computed(() => {
    const data = chatLRU.peek(sessionId.value)
    return data?.sendState ?? 'available'
  })

  // 下一状态（响应式）
  const nextState = computed(() => {
    const data = chatLRU.peek(sessionId.value)
    return data?.nextState ?? true
  })

  // 设置聊天列表
  const setDisplayChat = (value: ChatType[], currentSessionId: number) => {
    const data = chatLRU.peek(currentSessionId)
    if (data) {
      data.chatList = value
    }
  }

  // 设置发送状态
  const setSendState = (value: SendStateType, currentSessionId: number) => {
    const data = chatLRU.peek(currentSessionId)
    if (data) {
      data.sendState = value
    }
  }

  // 设置下一状态
  const setNextState = (value: boolean, currentSessionId: number) => {
    const data = chatLRU.peek(currentSessionId)
    if (data) {
      data.nextState = value
    }
  }

  // 中断流式请求
  const abortStream = () => {
    const currentSessionId = sessionId.value
    const data = chatLRU.peek(currentSessionId)
    if (data) {
      data.controller?.abort()
      data.controller = null
    }
  }

  // 初始化聊天记录
  const initDisplayChat = async (currentSessionId: number) => {
    if (currentSessionId < 0) return

    // LRU Cache 会自动更新访问时间
    if (chatLRU.has(currentSessionId)) {
      return
    }

    try {
      const res = await request<{ chatList: ChatType[] }>({
        url: API.getChatData,
        method: 'GET',
        params: { sessionId: currentSessionId },
      })

      // 设置缓存，若超过限制会自动淘汰最久未使用的
      chatLRU.set(currentSessionId, {
        chatList: res.data.chatList,
        backupChatList: clone(res.data.chatList),
        sendState: 'available',
        nextState: true,
        controller: null,
      })
    } catch (error) {
      console.log(error)
    }
  }

  // ... 其他方法改造
})
```

### 3.2 需要改造的方法列表

| 方法名            | 改造内容                                  |
| ----------------- | ----------------------------------------- |
| `initDisplayChat` | 使用 `chatLRU.set()` 替代 `pushChatQueue` |
| `displayChat`     | 使用 `chatLRU.get()`                      |
| `sendState`       | 使用 `chatLRU.peek()`（不更新访问时间）   |
| `nextState`       | 使用 `chatLRU.peek()`                     |
| `setDisplayChat`  | 使用 `chatLRU.peek()` 获取引用后修改      |
| `setSendState`    | 使用 `chatLRU.peek()` 获取引用后修改      |
| `setNextState`    | 使用 `chatLRU.peek()` 获取引用后修改      |
| `abortStream`     | 使用 `chatLRU.peek()`                     |
| `pushUserText`    | 使用 `chatLRU.peek()`                     |
| `deleteChat`      | 使用 `chatLRU.peek()`                     |
| `submitPrefers`   | 使用 `chatLRU.peek()`                     |

### 3.3 删除的代码

```typescript
// 删除以下代码
const chatMap = reactive(new Map<number, ChatMapValueTpye>())
const chatQueue: number[] = []
const pushChatQueue = (currentSessionId: number, data: ChatMapValueTpye) => {...}
```

---

## 四、关键注意事项

### 4.1 `get` vs `peek` 的选择

| 方法     | 是否更新访问时间 | 使用场景                       |
| -------- | ---------------- | ------------------------------ |
| `get()`  | ✅ 更新          | 用户主动访问会话（如切换会话） |
| `peek()` | ❌ 不更新        | 内部状态更新、computed 计算    |

**原则**：

- 用户行为触发的访问使用 `get()`，确保活跃会话不被淘汰
- 内部状态修改使用 `peek()`，避免无意义的访问时间更新

### 4.2 淘汰时的清理工作

在 `dispose` 回调中处理：

```typescript
dispose: (value, key, reason) => {
  if (reason === 'evict') {
    // 1. 中断流式请求
    value.controller?.abort()

    // 2. 可选：保存未保存的数据
    // saveUnsavedData(key, value)

    // 3. 可选：发送日志
    // logEviction(key, reason)
  }
}
```

### 4.3 调试支持

```typescript
// 开发环境下添加调试方法
if (import.meta.env.DEV) {
  window.__chatLRU__ = chatLRU

  // 定期打印缓存状态
  setInterval(() => {
    console.log('LRU Cache Status:', {
      size: chatLRU.size,
      keys: [...chatLRU.keys()],
    })
  }, 30000)
}
```

---

## 五、测试要点

### 5.1 功能测试

- [ ] 新建会话时正确缓存
- [ ] 切换会话时正确读取缓存
- [ ] 超过 5 个会话时正确淘汰最久未使用的
- [ ] 淘汰时正确中断流式请求
- [ ] 删除会话后缓存同步更新

### 5.2 边界测试

- [ ] 空会话处理
- [ ] 并发请求时的缓存一致性
- [ ] 网络错误时的缓存状态

### 5.3 性能测试

- [ ] 大量会话切换时的性能
- [ ] 缓存命中率统计

---

## 六、改造步骤

1. **备份现有代码**
2. **添加 LRU Cache 实例**
3. **改造 computed 属性**
4. **改造 setter 方法**
5. **改造 initDisplayChat**
6. **删除旧代码（chatMap、chatQueue、pushChatQueue）**
7. **测试验证**

---

## 七、可选增强

### 7.1 动态缓存大小

```typescript
const MAX_CACHE_SIZE = computed(() => {
  // 根据设备内存动态调整
  return navigator.deviceMemory >= 8 ? 10 : 5
})
```

### 7.2 缓存持久化

```typescript
// 页面卸载前保存到 localStorage
window.addEventListener('beforeunload', () => {
  const cacheData = [...chatLRU.entries()]
  localStorage.setItem('chatCache', JSON.stringify(cacheData))
})

// 页面加载时恢复
const savedCache = localStorage.getItem('chatCache')
if (savedCache) {
  JSON.parse(savedCache).forEach(([key, value]) => {
    chatLRU.set(key, value)
  })
}
```

### 7.3 缓存统计

```typescript
let hitCount = 0
let missCount = 0

const getWithStats = (key: number) => {
  const value = chatLRU.get(key)
  if (value) hitCount++
  else missCount++
  return value
}

const getCacheStats = () => ({
  hitRate: hitCount / (hitCount + missCount),
  size: chatLRU.size,
})
```

---

## 八、总结

| 对比项       | 现有实现           | LRU 实现         |
| ------------ | ------------------ | ---------------- |
| 淘汰策略     | FIFO               | LRU              |
| 代码复杂度   | 需维护两个数据结构 | 单一数据结构     |
| 访问顺序更新 | 不支持             | 自动更新         |
| 淘汰回调     | 手动处理           | dispose 自动处理 |
| 内存管理     | 手动               | 自动             |
