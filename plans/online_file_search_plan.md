# 线上文件搜索功能实现计划

## 一、上传文件夹流程梳理

### 1.1 当前流程

```
用户选择本地文件夹
    ↓
Editor/index.vue: uploadDirectory()
    ↓
1. 弹出对话框输入文件夹名称
2. 使用 buildFileTree() 构建文件树
3. 调用 API.fileTree 上传文件树结构
4. 调用 API.uploadFile 上传文件内容
    ↓
上传成功后刷新目录列表
    ↓
Directory.vue: getDirectory() 获取用户所有目录
```

### 1.2 关键代码分析

**Directory.vue 获取目录：**
```typescript
const getDirectory = async () => {
  const res = await request<{ list: ListItem[] }>({
    url: '/file/file/fileTree',  // GET 获取用户目录列表
    method: 'GET',
    params: { userId: userId },
  })
  list.value = res.data.list  // ListItem: { id, name, tree, user_id }
}
```

**点击目录加载文件树：**
```typescript
const setReadonlyMode = (tree: FileNode) => {
  readonlyMode.value = true
  fileTree.value = tree  // 设置当前文件树
  selectedFile.value = null
}
```

**点击文件获取内容：**
```typescript
const handleFileClickReadonly = async (fileNode: FileNode) => {
  const res = await request<{ content: string }>({
    url: API.getContentbyFilePath,  // GET /file/file/getContentbyFilePath
    method: 'GET',
    params: { filePath: fileNode.path },
  })
  sourceMap.value.set(fileNode, {
    type: 'text',
    content: res.data.content,
  })
}
```

### 1.3 数据流总结

```
Directory.vue          Editor/index.vue          后端
     │                       │                    │
     │── getDirectory() ────▶│                    │
     │◀── 目录列表 [{tree}] ──│                    │
     │                       │                    │
     │── setReadonlyMode() ─▶│                    │
     │    (传递 tree)        │                    │
     │                       │                    │
     │                       │── handleFileClickReadonly()
     │                       │    (调用 getContentbyFilePath)
     │                       │───────────────────▶│
     │                       │◀── 文件内容 ───────│
```

## 二、实现查找线上文件关键词的步骤

### 2.1 核心差异分析

| 对比项 | 本地文件搜索 | 线上文件搜索 |
|--------|-------------|-------------|
| 文件来源 | 浏览器 File 对象 | 后端存储的文件 |
| 文件树 | buildFileTree() 构建 | Directory.vue 获取的 tree |
| 文件内容 | FileReader 读取 | API.getContentbyFilePath 获取 |
| 搜索时机 | 本地实时搜索 | 需要后端支持或前端批量获取 |

### 2.2 实现方案

#### 方案 A：前端批量获取后搜索（推荐）

**优点：**
- 复用现有搜索逻辑
- 实现简单，不需要后端改动

**缺点：**
- 文件多时需要批量请求
- 首次搜索较慢

**步骤：**

1. **扩展 SearchStore 支持线上文件**
```typescript
// 区分本地/线上文件树
const fileTreeSource = ref<'local' | 'online'>('local')
const onlineFileTree = ref<FileNode | null>(null)

const setOnlineFileTree = (tree: FileNode) => {
  onlineFileTree.value = tree
  fileTreeSource.value = 'online'
}
```

2. **修改搜索逻辑，支持从后端获取文件内容**
```typescript
const searchOnlineFiles = async (keyword: string) => {
  if (!onlineFileTree.value) return
  
  const files = collectAllFiles(onlineFileTree.value)
  const searchResults: SearchResult[] = []
  
  for (const fileNode of files) {
    try {
      // 从后端获取文件内容
      const res = await request<{ content: string }>({
        url: API.getContentbyFilePath,
        method: 'GET',
        params: { filePath: fileNode.path },
      })
      
      if (res.success) {
        const content = res.data.content
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          const matches = extractMatchContext(content, keyword)
          searchResults.push({ fileNode, matches })
        }
      }
    } catch {
      // 忽略获取失败的文件
    }
  }
  
  results.value = searchResults
}
```

3. **Directory.vue 点击时同步文件树到 SearchStore**
```typescript
// Directory.vue
const setReadonlyMode = (tree: FileNode) => {
  // ... 原有逻辑
  searchStore.setOnlineFileTree(tree)  // 新增
}
```

4. **Layout 搜索区支持切换搜索源**
- 当用户点击线上目录时，自动切换到线上文件搜索
- 或者提供切换按钮让用户选择搜索源

#### 方案 B：后端提供搜索接口

**优点：**
- 前端实现简单
- 搜索速度快
- 支持大文件搜索

**缺点：**
- 需要后端开发新接口

**需要的后端接口：**
```typescript
// POST /file/file/search
{
  userId: number,
  treeId: number,  // 或目录ID
  keyword: string
}

// Response
{
  results: [
    {
      filePath: string,
      fileName: string,
      matches: [
        { context: string, index: number, length: number }
      ]
    }
  ]
}
```

### 2.3 推荐实施方案

**采用方案 A（前端批量获取）**，原因：
1. 不需要后端改动，可快速实现
2. 文件数量通常不会太多（面试刷题场景）
3. 可复用现有搜索组件和逻辑

### 2.4 详细实现步骤

#### 步骤 1：扩展 SearchStore

```typescript
// src/stores/search.ts

export const useSearchStore = defineStore('search', () => {
  // ... 原有状态
  
  const fileTreeSource = ref<'local' | 'online'>('local')
  const onlineFileTree = ref<FileNode | null>(null)
  
  const setOnlineFileTree = (tree: FileNode) => {
    onlineFileTree.value = tree
    fileTreeSource.value = 'online'
    // 清空本地搜索状态
    fileTree.value = null
  }
  
  const setLocalFileTree = (tree: FileNode | null) => {
    fileTree.value = tree
    fileTreeSource.value = 'local'
    onlineFileTree.value = null
  }
  
  const search = async (searchKeyword: string) => {
    // ... 原有校验
    
    if (fileTreeSource.value === 'online' && onlineFileTree.value) {
      await searchOnlineFiles(searchKeyword)
    } else if (fileTreeSource.value === 'local' && fileTree.value) {
      await searchLocalFiles(searchKeyword)
    }
  }
  
  const searchOnlineFiles = async (keyword: string) => {
    // 实现见上文
  }
  
  const searchLocalFiles = async (keyword: string) => {
    // 原有本地搜索逻辑
  }
  
  return {
    // ... 原有返回
    fileTreeSource,
    onlineFileTree,
    setOnlineFileTree,
    setLocalFileTree,
  }
})
```

#### 步骤 2：修改 Directory.vue

```typescript
// Directory.vue
import { useSearchStore } from '@/stores/search'

const searchStore = useSearchStore()

const setReadonlyMode = (tree: FileNode) => {
  if (userStore.isMobile) {
    showMenu.value = true
  }
  readonlyMode.value = true
  fileTree.value = tree
  selectedFile.value = null
  
  // 同步到 SearchStore
  searchStore.setOnlineFileTree(tree)
}
```

#### 步骤 3：修改 Editor/index.vue

```typescript
// 本地文件选择时
watch(fileTree, (newTree) => {
  if (!readonlyMode.value) {
    searchStore.setLocalFileTree(newTree)
  }
})

// 监听线上文件选中
watch(
  () => searchStore.selectedFileFromSearch,
  (fileNode) => {
    if (fileNode && readonlyMode.value) {
      handleFileClickReadonly(fileNode)
      searchStore.clearSelectedFile()
    }
  }
)
```

#### 步骤 4：修改 SearchResults.vue

```typescript
// 根据 fileTreeSource 显示不同的提示
const isOnline = computed(() => searchStore.fileTreeSource === 'online')

const emptyTip = computed(() => {
  if (isOnline.value) {
    return '请先在编辑器中选择线上目录'
  }
  return '请先在编辑器中打开本地目录'
})
```

### 2.5 优化考虑

1. **缓存文件内容**
   - 搜索过的文件内容缓存到 Map，避免重复请求
   
2. **并发控制**
   - 使用 Promise.all 或 p-limit 控制并发请求数
   
3. **搜索进度显示**
   - 显示 "正在搜索第 X/Y 个文件"
   
4. **取消搜索**
   - 支持 AbortController 取消正在进行的搜索

### 2.6 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `src/stores/search.ts` | 添加 fileTreeSource、onlineFileTree 状态，实现 searchOnlineFiles |
| `src/pages/Editor/Directory.vue` | 点击目录时调用 setOnlineFileTree |
| `src/pages/Editor/index.vue` | 本地文件用 setLocalFileTree，支持线上文件跳转 |
| `src/pages/Layout/SearchResults.vue` | 根据搜索源显示不同提示 |
