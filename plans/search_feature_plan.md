# 本地文件搜索功能实现计划

## 需求概述

为 Editor 的「本地文件」模式添加关键字搜索功能：用户点击 Layout 侧边栏的搜索区域，输入关键字后，搜索区以下区域显示包含该关键字的文件名列表。

## 核心挑战

**如何读取目录树的 file 字段获取文件内容进行匹配？**

- `FileNode.file` 是浏览器 `File` 对象，需要使用 `FileReader` 异步读取
- 需要遍历整个 `fileTree`，筛选出所有 `isFile=true` 的节点
- 搜索是异步操作，需要处理加载状态

## 技术方案

### 1. 状态管理

创建 `src/stores/search.ts`，管理搜索相关状态：

```typescript
interface SearchState {
  keyword: string // 搜索关键字
  results: SearchResult[] // 搜索结果
  isSearching: boolean // 搜索中状态
}

interface SearchResult {
  fileNode: FileNode // 匹配的文件节点引用
  matches: string[] // 匹配的内容片段（可选，用于预览）
}
```

### 2. 搜索逻辑实现

在 `src/stores/search.ts` 中实现搜索函数：

```typescript
async function searchInFileTree(fileTree: FileNode, keyword: string): Promise<SearchResult[]>
```

**实现步骤：**

1. **遍历文件树**：递归遍历 `fileTree`，收集所有 `isFile=true` 的节点
2. **过滤文件类型**：跳过图片、二进制等非文本文件（通过 MIME 类型判断）
3. **异步读取文件**：使用 `FileReader.readAsText()` 读取文件内容
4. **关键字匹配**：在文件内容中搜索关键字（可考虑大小写不敏感）
5. **返回结果**：返回匹配的文件节点列表

**关键代码示例：**

```typescript
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result || '')
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsText(file)
  })
}

const searchInFileTree = async (root: FileNode, keyword: string): Promise<SearchResult[]> => {
  const results: SearchResult[] = []
  const textFileTypes = ['text/', 'application/json', 'application/javascript', 'application/xml']

  const traverse = async (node: FileNode) => {
    if (node.isFile && node.file) {
      // 判断是否为文本文件
      const isTextFile =
        textFileTypes.some((type) => node.file!.type.startsWith(type)) || !node.file.type // 无类型时尝试读取

      if (isTextFile) {
        try {
          const content = await readFileContent(node.file)
          if (content.toLowerCase().includes(keyword.toLowerCase())) {
            results.push({ fileNode: node, matches: [] })
          }
        } catch {
          // 忽略读取失败的文件
        }
      }
    } else {
      for (const child of node.children) {
        await traverse(child)
      }
    }
  }

  await traverse(root)
  return results
}
```

### 3. 组件间通信

**方案：使用 Pinia Store + 事件机制**

```
Layout (搜索栏) ──触发搜索──> SearchStore ──获取 fileTree──> Editor
       │                           │
       └──显示搜索结果──<──results──┘
```

**问题**：Layout 如何获取 Editor 的 `fileTree`？

**解决方案**：

- 方案A：在 SearchStore 中存储 fileTree 的引用，Editor 在加载本地文件时更新
- 方案B：使用 `provide/inject` 跨组件传递 fileTree
- 方案C：使用事件总线或 mitt 库

**推荐方案A**：简单直接，符合现有架构

### 4. UI 改造

#### 4.1 Layout/index.vue 改造

**搜索区域改造：**

```vue
<div class="search-view">
  <div class="search-box" @click="toggleSearchMode">
    <div class="left">
      <font-awesome-icon :icon="faMagnifyingGlass" class="icon" />
      <input
        v-if="isSearchMode"
        v-model="searchKeyword"
        placeholder="搜索文件内容..."
        @input="handleSearch"
      />
      <div v-else>搜索</div>
    </div>
  </div>
</div>
```

**搜索结果区域：**

```vue
<div v-if="isSearchMode && searchResults.length" class="search-results">
  <div
    v-for="result in searchResults"
    :key="result.fileNode.path"
    class="result-item"
    @click="navToEditorFile(result.fileNode)"
  >
    <img :src="fileIcon" alt="" class="icon" />
    <div class="file-name">{{ result.fileNode.name }}</div>
    <div class="file-path">{{ result.fileNode.path }}</div>
  </div>
</div>
```

#### 4.2 样式调整

- 搜索结果列表样式与 `session-list` 保持一致
- 移动端适配

### 5. 交互流程

```
1. 用户在 Editor 页面打开本地目录 → fileTree 生成 → 存入 SearchStore
2. 用户点击 Layout 搜索栏 → 进入搜索模式
3. 用户输入关键字 → 触发搜索（防抖处理）
4. 显示搜索结果列表
5. 用户点击结果项 → 跳转到 Editor 并打开对应文件
```

## 文件修改清单

| 文件                         | 操作 | 说明                         |
| ---------------------------- | ---- | ---------------------------- |
| `src/stores/search.ts`       | 新建 | 搜索状态管理                 |
| `src/pages/Layout/index.vue` | 修改 | 添加搜索UI和结果展示         |
| `src/pages/Editor/index.vue` | 修改 | 同步 fileTree 到 SearchStore |

## 实现步骤

### 第一阶段：基础架构

1. 创建 `src/stores/search.ts`
2. 定义 `SearchState` 接口和 `SearchResult` 类型
3. 实现 `searchInFileTree` 函数

### 第二阶段：状态同步

1. 在 Editor 中监听 `fileTree` 变化，同步到 SearchStore
2. 在 Layout 中引入 SearchStore

### 第三阶段：UI 实现

1. 改造 Layout 搜索区域为可输入状态
2. 实现搜索结果列表 UI
3. 添加搜索防抖（300ms）

### 第四阶段：交互完善

1. 实现点击搜索结果跳转到 Editor 并打开文件
2. 添加空状态提示（无结果/未加载目录）
3. 移动端适配

## 性能优化（可选）

1. **防抖处理**：输入时延迟搜索，避免频繁读取文件
2. **Web Worker**：将文件读取和匹配放到 Worker 中，避免阻塞 UI
3. **缓存机制**：缓存已读取的文件内容，避免重复读取
4. **取消机制**：支持取消正在进行的搜索

## 边界情况处理

1. 未加载本地目录时，提示用户先打开目录
2. 文件过大时，限制读取大小或跳过
3. 二进制文件跳过搜索
   注意：只搜索.md,.txt文本文件，跳过图片类型文件
4. 搜索关键字为空时，清空结果

## 测试要点

1. 搜索中文关键字
2. 搜索英文关键字（大小写）
3. 搜索代码中的函数名/变量名
4. 大量文件时的性能表现
5. 移动端搜索体验
