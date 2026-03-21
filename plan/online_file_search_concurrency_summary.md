# 线上文件搜索并发请求实践总结

## 概述

在实现线上文件关键词搜索功能时，需要遍历文件树并对每个文件发起 HTTP 请求获取内容进行匹配。采用并发池控制请求数量的方案，在保证搜索效率的同时避免对服务器造成过大压力。

## 核心实现

### 并发池 SuperTask

```typescript
class SuperTask<T = any> {
  poolSize: number
  taskQueue: Task<T>[] = []
  runningCount: number = 0

  constructor(poolSize: number) {
    this.poolSize = poolSize
  }

  add(task: Task<T>['fn']): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ fn: task, resolve, reject })
      this.runTask()
    })
  }

  runTask() {
    while (this.runningCount < this.poolSize && this.taskQueue.length) {
      this.runningCount++
      const task = this.taskQueue.shift()!
      task.fn().then(task.resolve).catch(task.reject).finally(() => {
        this.runningCount--
        this.runTask()
      })
    }
  }
}
```

### 统一搜索函数

```typescript
const searchFiles = async (
  searchKeyword: string,
  tree: FileNode,
  getContent: (fileNode: FileNode) => Promise<string | null>
) => {
  const files = collectAllFiles(tree)
  const lowerKeyword = searchKeyword.toLowerCase()

  const results = await Promise.all(
    files.map((fileNode) =>
      superTask.add(async () => {
        const fileNameMatch = fileNode.name.toLowerCase().includes(lowerKeyword)
        const searchResult: SearchResult = { fileNode, matches: [] }

        const content = await getContent(fileNode)
        if (content && content.toLowerCase().includes(lowerKeyword)) {
          searchResult.matches = extractMatchContext(content, searchKeyword)
        }

        return fileNameMatch || searchResult.matches.length > 0 ? searchResult : null
      })
    )
  )

  return results.filter((r): r is SearchResult => r !== null)
}
```

## 为什么这是良好的工程实践

### 1. 并发控制避免资源耗尽

浏览器对同一域名的并发请求有限制（通常6个），服务器也有处理能力上限。无限制并发会导致：
- 浏览器请求队列阻塞
- 服务器压力过大
- 网络带宽争抢

通过并发池限制为5个同时请求，在效率和资源占用之间取得平衡。

### 2. 任务队列保证执行顺序

SuperTask 使用队列管理待执行任务，保证：
- 先添加的任务先执行
- 一个任务完成后自动执行下一个
- 不会遗漏任何任务

### 3. 错误隔离

每个文件的搜索任务独立处理，单个文件请求失败不会影响其他文件：

```typescript
task.fn().then(task.resolve).catch(task.reject).finally(...)
```

### 4. 统一抽象降低耦合

通过 `getContent` 回调参数，将"获取内容"的具体实现与"搜索逻辑"解耦：

```typescript
// 本地文件
const searchLocalFiles = (searchKeyword: string, tree: FileNode) =>
  searchFiles(searchKeyword, tree, async (fileNode) => {
    return await readFileContent(fileNode.file!)
  })

// 线上文件
const searchOnlineFiles = (searchKeyword: string, tree: FileNode) =>
  searchFiles(searchKeyword, tree, async (fileNode) => {
    const res = await request({ url: API.getContentbyFilePath, ... })
    return res.success ? res.data.content : null
  })
```

### 5. Promise.all 统一管理

使用 `Promise.all` 等待所有任务完成，便于：
- 统一获取所有结果
- 统一处理完成状态
- 配合 async/await 简化代码

## 性能分析

假设文件树有 N 个文件，每个请求耗时 T：

| 方案 | 总耗时 | 特点 |
|------|--------|------|
| 串行请求 | N × T | 最慢，但最稳定 |
| 无限制并发 | T（理想） | 最快，但可能触发限制或超载 |
| 并发池（5） | ⌈N/5⌉ × T | 平衡效率和稳定性 |

对于 50 个文件，每个请求 200ms：
- 串行：10 秒
- 并发池（5）：2 秒
- 提升 5 倍

## 可选优化方向

### 1. 请求取消

用户快速切换关键词或文件树时，可取消进行中的请求：

```typescript
const controller = new AbortController()
// 在请求中传入 signal
// 切换时调用 controller.abort()
```

### 2. 防抖

避免用户快速输入时频繁触发搜索：

```typescript
import { debounce } from 'lodash-es'

watch([keyword, currentFileTree], debounce(([newKeyword, newTree]) => {
  search(newKeyword)
}, 300))
```

### 3. 结果缓存

对于已搜索过的文件内容进行缓存，减少重复请求（需权衡内存占用）。

## 总结

并发池方案是处理批量异步请求的标准模式，在文件搜索场景中：
- 显著提升搜索速度
- 避免资源耗尽风险
- 代码结构清晰可维护
- 易于扩展和优化

这是一个经过验证的、可靠的工程实践方案。
