# 文件搜索功能优化方案

## 一、当前实现分析

### 1.1 实现方式

前端并发请求获取所有文件内容，在客户端进行关键词匹配：

```
用户输入关键词
    ↓
前端遍历文件树
    ↓
并发请求获取每个文件内容 (并发池控制 5 个)
    ↓
前端匹配关键词
    ↓
返回匹配结果
```

### 1.2 优点

| 优点 | 说明 |
|------|------|
| 实现简单 | 不需要后端改动，复用现有 API |
| 前端可控 | 搜索逻辑完全在前端，便于调试 |
| 即时响应 | 无需等待后端开发 |

### 1.3 缺点

| 缺点 | 说明 |
|------|------|
| **带宽浪费** | 需要传输所有文件内容到前端，即使大部分不匹配 |
| **性能瓶颈** | 前端处理大量文本可能阻塞主线程 |
| **请求过多** | 文件数量多时，即使有并发池，总耗时也很长 |
| **扩展性差** | 文件数量增长时，性能线性下降 |
| **无法利用索引** | 后端可以建立搜索索引，前端无法实现 |

### 1.4 性能估算

假设：
- 20 个文件，每个 10KB
- 网络延迟 100ms/请求
- 并发数 5

**当前方案耗时：**
- 请求数：20 个
- 批次：20 / 5 = 4 批
- 总耗时：4 × 100ms = 400ms（仅网络延迟，不含传输时间）

**后端搜索方案耗时：**
- 请求数：1 个
- 总耗时：100ms + 服务端处理时间

## 二、推荐方案：后端搜索接口

### 2.1 方案设计

新增后端搜索接口，在服务端完成搜索：

```typescript
// POST /file/file/searchContent
interface SearchRequest {
  userId: number
  keyword: string
  treeId?: number  // 可选，指定搜索某个目录
}

interface SearchResponse {
  results: SearchResult[]
}

interface SearchResult {
  filePath: string
  fileName: string
  matches: MatchInfo[]
}

interface MatchInfo {
  context: string   // 匹配上下文
  index: number     // 在文件中的位置
  length: number    // 关键词长度
}
```

### 2.2 后端实现要点

```typescript
// 伪代码
async function searchContent(userId: number, keyword: string) {
  // 1. 获取用户文件树
  const fileTrees = await getFileTrees(userId)
  
  // 2. 收集所有文件路径
  const files = collectFiles(fileTrees)
  
  // 3. 并发搜索（服务端可使用更高并发）
  const results = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file.path)
      const matches = findMatches(content, keyword)
      return matches.length > 0 ? { file, matches } : null
    })
  )
  
  // 4. 过滤并返回
  return results.filter(Boolean)
}
```

### 2.3 前端改造

```typescript
// search.ts
const searchOnlineFiles = async (searchKeyword: string, tree: FileNode) => {
  const res = await request<SearchResponse>({
    url: API.searchContent,
    method: 'POST',
    data: {
      userId: userStore.userInfo.userId,
      keyword: searchKeyword,
    },
  })
  
  if (res.success) {
    return res.data.results.map(r => ({
      fileNode: findFileNodeByPath(tree, r.filePath),
      matches: r.matches,
    }))
  }
  return []
}
```

### 2.4 优势对比

| 对比项 | 前端搜索 | 后端搜索 |
|--------|----------|----------|
| 请求数 | N 个文件 = N 个请求 | 1 个请求 |
| 数据传输 | 全部文件内容 | 仅匹配结果 |
| 响应速度 | 慢（多请求累积） | 快（单请求） |
| 扩展性 | 差（线性增长） | 好（可优化索引） |
| 离线支持 | 支持 | 不支持 |

## 三、进阶优化

### 3.1 搜索索引

对于大量文件，后端可建立搜索索引：

```typescript
// 使用 Elasticsearch 或 MeiliSearch
interface FileIndex {
  id: string
  userId: number
  filePath: string
  fileName: string
  content: string  // 可分词存储
  updatedAt: Date
}

// 搜索时直接查询索引
async function searchWithIndex(keyword: string) {
  return await elasticsearch.search({
    index: 'files',
    body: {
      query: {
        multi_match: {
          query: keyword,
          fields: ['fileName', 'content']
        }
      }
    }
  })
}
```

### 3.2 增量更新

文件上传/修改时更新索引：

```typescript
// 文件上传时
async function uploadFile(file, userId) {
  // 1. 保存文件
  await saveFile(file)
  
  // 2. 更新索引
  await updateIndex({
    id: file.path,
    userId,
    fileName: file.name,
    content: await readFileContent(file),
  })
}
```

### 3.3 搜索建议

添加搜索建议功能：

```typescript
// GET /file/file/suggestions?keyword=xxx
interface SuggestionResponse {
  suggestions: string[]  // 历史搜索词 + 热门关键词
}
```

## 四、实施建议

### 4.1 短期方案（当前可用）

保持现有前端搜索实现，适用于：
- 文件数量少（< 50 个）
- 文件体积小（< 100KB/文件）
- 快速上线需求

### 4.2 中期方案（推荐）

实现后端搜索接口：
1. 新增 `/file/file/searchContent` 接口
2. 前端调用新接口
3. 保留前端搜索作为降级方案

### 4.3 长期方案

引入搜索引擎：
1. 部署 Elasticsearch / MeiliSearch
2. 建立文件索引
3. 支持高级搜索（模糊匹配、正则等）

## 五、结论

**当前前端并发搜索方案：**
- ✅ 适合小规模文件、快速实现场景
- ❌ 不适合大规模文件、生产环境长期使用

**推荐：** 实现后端搜索接口，将搜索逻辑移至服务端，可显著提升性能和用户体验。
