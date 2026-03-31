# LRUCache 使用说明

## 概述

`LRUCache` 是一个基于 LRU（最近最少使用）淘汰策略的缓存类，支持 Vue 3 响应式特性。当缓存容量达到上限时，会自动淘汰最久未访问的数据。

## 基本用法

```typescript
import { LRUCache } from '@/utils/LRUCache'

const cache = new LRUCache<string>(3)

cache.put('a', 'value-a')
cache.put('b', 'value-b')
cache.put('c', 'value-c')

console.log(cache.get('a'))
console.log(cache.size)
```

## API

### 构造函数

```typescript
constructor(capacity: number)
```

- `capacity`: 缓存最大容量

### 方法

| 方法                 | 参数                                | 返回值           | 说明                             |
| -------------------- | ----------------------------------- | ---------------- | -------------------------------- |
| `put(key, value)`    | key: `string \| number`, value: `T` | `void`           | 添加或更新缓存项                 |
| `get(key)`           | key: `string \| number`             | `T \| undefined` | 获取缓存值，同时更新访问顺序     |
| `modify(key, value)` | key: `string \| number`, value: `T` | `void`           | 修改已存在缓存项的值             |
| `delete(key)`        | key: `string \| number`             | `boolean`        | 删除指定缓存项，返回是否删除成功 |

### 属性

| 属性       | 类型                       | 说明                         |
| ---------- | -------------------------- | ---------------------------- |
| `map`      | `Map<MapKey, ListNode<T>>` | 响应式 Map，存储所有缓存节点 |
| `size`     | `number`                   | 当前缓存大小                 |
| `capacity` | `number`                   | 缓存最大容量                 |

## LRU 淘汰机制

当缓存达到容量上限时，再添加新数据会自动淘汰最久未访问的数据：

```typescript
const cache = new LRUCache<number>(3)

cache.put('a', 1)
cache.put('b', 2)
cache.put('c', 3)
cache.put('d', 4)

console.log(cache.get('a'))
console.log(cache.get('b'))
console.log(cache.get('c'))
console.log(cache.get('d'))
```

`get` 和 `put` 操作会将访问的数据标记为最近使用，延长其在缓存中的存活时间：

```typescript
const cache = new LRUCache<number>(3)

cache.put('a', 1)
cache.put('b', 2)
cache.put('c', 3)

cache.get('a')

cache.put('d', 4)

console.log(cache.get('a'))
console.log(cache.get('b'))
console.log(cache.get('c'))
console.log(cache.get('d'))
```

## 响应式特性

### 核心原理

LRUCache 的响应式特性基于 Vue 3 的 `reactive` API 实现。在构造函数中，内部 Map 被包装为响应式对象：

```typescript
constructor(capacity: number) {
  this.map = reactive(new Map<MapKey, ListNode<T>>()) as Map<MapKey, ListNode<T>>
  this.capacity = capacity
}
```

这意味着：

- `map.set()`、`map.delete()` 操作会触发响应式更新
- `map.size` 变化会触发响应式更新
- `map.get(key)?.val` 变化会触发响应式更新

### 响应式使用示例

#### 监听缓存值变化

```typescript
import { watch } from 'vue'

const cache = new LRUCache<number>(3)
cache.put('a', 1)

watch(
  () => cache.map.get('a')?.val,
  (newVal) => {
    console.log('值已更新:', newVal)
  }
)

cache.modify('a', 100)
```

#### 监听缓存大小变化

```typescript
watch(
  () => cache.map.size,
  (newSize) => {
    console.log('缓存大小:', newSize)
  }
)
```

#### 监听元素是否存在

```typescript
watch(
  () => cache.map.has('a'),
  (hasKey) => {
    if (hasKey) {
      console.log('元素存在')
    } else {
      console.log('元素已被淘汰或删除')
    }
  }
)
```

#### 在组件中使用

```vue
<template>
  <div>
    <p>缓存大小: {{ cache.map.size }}</p>
    <p>当前值: {{ currentValue }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { LRUCache } from '@/utils/LRUCache'

const cache = new LRUCache<{ value: number }>(10)
const currentValue = ref(0)

onMounted(() => {
  cache.put('item', { value: 10 })
  currentValue.value = cache.map.get('item')?.val?.value ?? 0

  watch(
    () => cache.map.get('item')?.val,
    (newVal) => {
      currentValue.value = newVal?.value ?? 0
    }
  )
})

function updateValue() {
  cache.modify('item', { value: Math.random() * 100 })
}
</script>
```

### 响应式触发场景

以下操作会触发响应式更新：

| 操作                   | 触发的响应式更新                                          |
| ---------------------- | --------------------------------------------------------- |
| `put(key, value)` 新增 | `map.size`、`map.has(key)`、`map.get(key)?.val`           |
| `put(key, value)` 更新 | `map.get(key)?.val`                                       |
| `put(key, value)` 淘汰 | `map.size`、被淘汰 key 的 `map.has()` 和 `map.get()?.val` |
| `modify(key, value)`   | `map.get(key)?.val`                                       |
| `delete(key)`          | `map.size`、`map.has(key)`、`map.get(key)?.val`           |
| `get(key)`             | 无（仅更新访问顺序，不改变值）                            |

### 注意事项

1. **两种修改方式的区别**

   Vue 3 的 `reactive` 对 Map 是深度代理的，从 `map.get()` 返回的对象值也会被自动转换为响应式代理。因此有两种修改方式：

   **方式一：直接修改对象属性**

   ```typescript
   const chatMapValue = cache.get('a')
   if (chatMapValue) {
     chatMapValue.name = 'new name'
   }
   ```

   - ✅ 会触发响应式更新（Vue 3 深度代理）
   - ❌ **不会更新 LRU 访问顺序**
   - 适用于：频繁修改对象内部属性，不需要更新访问顺序

   **方式二：使用 modify 方法**

   ```typescript
   const current = cache.peek('a')
   if (current) {
     cache.modify('a', { ...current, name: 'new name' })
   }
   ```

   - ✅ 会触发响应式更新
   - ✅ **会更新 LRU 访问顺序**
   - 适用于：需要将数据标记为最近使用

   **选择建议**：
   - 如果需要保持 LRU 顺序正确，使用 `modify()`
   - 如果只是临时修改属性且不关心访问顺序，可以直接修改

2. **引用类型值的深层响应式**

   Vue 3 的深度代理会自动处理嵌套对象，可以直接监听深层属性变化：

   ```typescript
   interface UserData {
     name: string
     age: number
   }

   const cache = new LRUCache<UserData>(10)
   cache.put('user', { name: 'Alice', age: 20 })

   watch(
     () => cache.get('user')?.name,
     (newName) => {
       console.log('用户名变化:', newName)
     }
   )

   const user = cache.get('user')
   if (user) {
     user.name = 'Bob'
   }
   ```

3. **避免在 watch 回调中同步修改被监听的值**

   这可能导致无限循环：

   ```typescript
   watch(
     () => cache.get('a')?.val,
     (newVal) => {
       cache.modify('a', newVal! + 1)
     }
   )
   ```

## 完整示例

```typescript
import { LRUCache } from '@/utils/LRUCache'
import { watch, ref, nextTick } from 'vue'

interface ChatMessage {
  id: number
  content: string
  timestamp: number
}

const messageCache = new LRUCache<ChatMessage>(50)
const latestMessage = ref<ChatMessage | null>(null)

watch(
  () => messageCache.map.get('latest')?.val,
  (newVal) => {
    latestMessage.value = newVal ?? null
  }
)

function addMessage(content: string) {
  const id = Date.now()
  const message: ChatMessage = {
    id,
    content,
    timestamp: id,
  }
  messageCache.put('latest', message)
}

function updateMessage(content: string) {
  const current = messageCache.get('latest')
  if (current) {
    messageCache.modify('latest', {
      ...current,
      content,
    })
  }
}

function deleteMessage() {
  messageCache.delete('latest')
}
```
