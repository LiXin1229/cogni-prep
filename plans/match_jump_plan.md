# 关键词位置跳转方案

## 需求

点击 `.match-item` 跳转到对应文件的对应关键词位置处。

## 核心问题

1. **如何定位关键词位置？**
   - 当前 `matches` 只存储了上下文字符串，没有存储关键词在文件中的**字符偏移量（index）**
   - 需要修改 `extractMatchContext` 返回位置信息

2. **如何跳转到编辑器中的指定位置？**
   - Editor 组件使用自定义的 Markdown 渲染器（`createMarkdown`）
   - 需要了解编辑器是否支持滚动到指定位置或高亮文本

## 技术方案

### 1. 扩展 SearchResult 类型

修改 `SearchResult` 接口，增加位置信息：

```typescript
export interface MatchInfo {
  context: string      // 上下文内容
  index: number        // 关键词在文件中的起始字符位置
  length: number       // 关键词长度
}

export interface SearchResult {
  fileNode: FileNode
  matches: MatchInfo[]
}
```

### 2. 修改 extractMatchContext 函数

```typescript
const extractMatchContext = (
  content: string, 
  keyword: string, 
  contextLength = 10
): MatchInfo[] => {
  const matches: MatchInfo[] = []
  const lowerContent = content.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  let index = 0

  while ((index = lowerContent.indexOf(lowerKeyword, index)) !== -1) {
    const start = Math.max(0, index - contextLength)
    const end = Math.min(content.length, index + keyword.length + contextLength)
    const context = content.slice(start, end)
    matches.push({
      context,
      index,
      length: keyword.length,
    })
    index += keyword.length
  }

  return matches
}
```

### 3. SearchStore 添加选中匹配项状态

```typescript
const selectedMatch = ref<{ fileNode: FileNode; matchIndex: number } | null>(null)

const selectMatch = (fileNode: FileNode, matchIndex: number) => {
  selectedFileFromSearch.value = fileNode
  selectedMatch.value = { fileNode, matchIndex }
}

const clearSelectedMatch = () => {
  selectedMatch.value = null
}
```

### 4. SearchResults.vue 添加点击事件

```vue
<div 
  v-for="(match, idx) in result.matches" 
  :key="idx" 
  class="match-item"
  @click.stop="handleMatchClick(result.fileNode, idx)"
>
  {{ match.context }}
</div>
```

```typescript
const handleMatchClick = (fileNode: FileNode, matchIndex: number) => {
  router.push({ name: '编辑器' })
  searchStore.selectMatch(fileNode, matchIndex)
  if (userStore.isMobile) {
    emit('close')
  }
}
```

### 5. Editor 组件实现跳转

**方案 A：使用 window.find()**

浏览器原生 API，可在页面中查找并高亮文本：

```typescript
// Editor/index.vue
watch(
  () => searchStore.selectedMatch,
  async (match) => {
    if (match) {
      const keyword = searchStore.keyword
      // 使用浏览器查找功能
      window.find(keyword)
      searchStore.clearSelectedMatch()
    }
  }
)
```

**方案 B：滚动到指定位置**

如果编辑器支持，根据字符偏移量计算行号并滚动：

```typescript
const scrollToPosition = (charIndex: number) => {
  const editorEl = editorRef.value
  if (!editorEl) return
  
  // 计算位置并滚动
  // 具体实现取决于编辑器结构
}
```

**方案 C：DOM 查找 + 高亮**

在编辑器 DOM 中查找关键词并高亮：

```typescript
const highlightAndScroll = (keyword: string) => {
  const editorEl = editorRef.value
  if (!editorEl) return
  
  // 使用 TreeWalker 或正则查找文本节点
  const walker = document.createTreeWalker(
    editorEl,
    NodeFilter.SHOW_TEXT,
    null
  )
  
  let node
  while ((node = walker.nextNode())) {
    const index = node.textContent?.toLowerCase().indexOf(keyword.toLowerCase())
    if (index !== -1 && index !== undefined) {
      // 找到匹配，滚动并高亮
      const range = document.createRange()
      range.setStart(node, index)
      range.setEnd(node, index + keyword.length)
      
      // 滚动到位置
      range.startContainer.parentElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
      
      // 高亮（使用 CSS 类或 Selection API）
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      
      break
    }
  }
}
```

## 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `src/stores/search.ts` | 修改 `MatchInfo` 类型，修改 `extractMatchContext`，添加 `selectedMatch` 状态 |
| `src/pages/Layout/SearchResults.vue` | 添加 `handleMatchClick`，修改模板绑定 |
| `src/pages/Editor/index.vue` | 监听 `selectedMatch`，实现跳转逻辑 |

## 实现步骤

1. 修改 `MatchInfo` 类型和 `extractMatchContext` 函数
2. SearchStore 添加 `selectedMatch` 状态和方法
3. SearchResults.vue 添加 match-item 点击事件
4. Editor 实现跳转逻辑（推荐方案 A 或 C）
5. 测试完整流程

## 推荐方案

**推荐方案 A（window.find）**：
- 实现简单，浏览器原生支持
- 自动高亮并滚动到匹配位置
- 兼容性好

如果 `window.find()` 效果不理想，再考虑方案 C（DOM 查找 + 高亮）。
