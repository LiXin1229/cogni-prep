# Cogni Prep - AI面试刷题助手

## 项目概述

Cogni Prep 是一个基于 Vue 3 + TypeScript 的 AI 面试刷题助手应用，提供智能对话、思维导图、笔记管理等功能，帮助用户高效准备技术面试。

## 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **UI组件库**: Element Plus
- **可视化**: D3.js (思维导图)
- **Markdown渲染**: Marked + Highlight.js
- **富文本编辑**: Quill
- **HTTP客户端**: Axios
- **代码规范**: ESLint + Prettier

## 项目结构

```
cogni-prep-ts/
├── src/
│   ├── assets/           # 静态资源
│   │   └── svgs/         # SVG图标
│   ├── components/       # 公共组件
│   │   ├── Blank.vue
│   │   ├── CustDialog.vue
│   │   ├── CustMenu.vue
│   │   ├── CustPopup.vue
│   │   ├── CustTextarea.vue
│   │   └── MindMap.vue   # D3思维导图组件
│   ├── directives/       # 自定义指令
│   │   ├── click-outside.ts
│   │   ├── mobile-hidden.ts
│   │   └── resizable.ts
│   ├── pages/            # 页面组件
│   │   ├── ChatView/     # AI对话页面
│   │   ├── Dialogs/      # 弹窗组件
│   │   ├── Editor/       # 富文本编辑器
│   │   ├── Layout/       # 布局组件
│   │   │   ├── index.vue       # 主布局
│   │   │   └── SearchResults.vue # 搜索结果组件
│   │   ├── Login/        # 登录页面
│   │   ├── MindMap/      # 思维导图页面
│   │   ├── Note/         # 笔记页面
│   │   └── Prefer/       # 收藏页面
│   ├── router/           # 路由配置
│   ├── stores/           # Pinia状态管理
│   │   ├── types/        # 类型定义
│   │   ├── chat.ts       # 聊天状态
│   │   ├── mindmap.ts    # 思维导图状态
│   │   ├── note.ts       # 笔记状态
│   │   ├── prefer.ts     # 收藏状态
│   │   ├── search.ts     # 文件搜索状态
│   │   ├── session.ts    # 会话状态
│   │   └── user.ts       # 用户状态
│   ├── styles/           # 全局样式
│   │   ├── cust-theme.scss
│   │   ├── main.scss
│   │   ├── md.scss       # Markdown样式
│   │   └── mixin.scss
│   ├── utils/            # 工具函数
│   │   ├── render/       # Markdown渲染相关
│   │   ├── types/        # 类型定义
│   │   ├── API.ts        # API接口定义
│   │   ├── markdown.ts   # Markdown处理
│   │   ├── request.ts    # HTTP请求封装
│   │   ├── highlightKeywords.ts # 关键词高亮
│   │   ├── superTask.ts  # 并发任务队列
│   │   └── ...           # 其他工具函数
│   ├── App.vue
│   ├── main.ts           # 应用入口
│   └── vite-env.d.ts
├── public/               # 公共资源
├── resource/             # 文档图片资源
├── package.json
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

## 核心功能

### 1. AI对话系统 (ChatView)

- **流式传输**: 使用 Fetch + ReadableStream 实现 SSE 流式响应
- **多会话管理**: 使用 Map 数据结构隔离不同对话状态
- **消息类型**: 用户发言、AI提问、AI评价、获取帮助
- **功能模式**: 标准模式、@回答思路、@标准答案、@思路+答案、@自由对话、@自定义问题

核心实现:

```typescript
// stores/chat.ts
const chatMap = reactive(new Map<number, ChatMapValueTpye>())
const chatQueue: number[] = []

// 限制Map大小，防止内存泄漏
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

### 2. 思维导图 (MindMap)

- **技术**: D3.js 实现可交互树状图
- **功能**: 节点展开/折叠、缩放、拖拽、AI生成节点
- **数据管理**: 树形数据结构，支持增删改查

数据结构:

```typescript
interface TreeNode {
  id: string
  name: string
  children: TreeNode[]
  isRoot?: boolean
  frequency: number // 出现频率
  isFolded: number // 折叠状态
  chatId: number | null // 关联的聊天ID
  markId: number | null // 关联的收藏ID
}
```

### 3. 富文本编辑器 (Editor)

- **技术**: Quill Editor
- **功能**: 目录生成、文件树管理、浮动工具栏
- **特性**: 图片上传、Markdown支持

### 4. 笔记系统 (Note)

- 笔记列表管理
- 与思维导图节点关联
- 支持收藏功能

### 5. 文件搜索系统 (Search)

- **搜索范围**: 支持本地文件和线上文件搜索
- **搜索内容**: 文件名匹配 + 文件内容全文搜索
- **并发控制**: 使用 `SuperTask` 类控制并发请求数量
- **结果展示**: 关键词高亮、匹配上下文预览、点击跳转

核心数据结构:

```typescript
interface SearchResult {
  fileNode: FileNode
  matches: MatchInfo[] // 匹配信息列表
}

interface MatchInfo {
  context: string // 匹配上下文
  index: number // 匹配位置
  length: number // 匹配长度
}
```

## 状态管理 (Pinia Stores)

| Store        | 功能                               |
| ------------ | ---------------------------------- |
| `chat.ts`    | 管理聊天状态、流式响应、消息历史   |
| `mindmap.ts` | 管理思维导图数据、节点操作         |
| `note.ts`    | 管理笔记数据                       |
| `prefer.ts`  | 管理收藏内容                       |
| `search.ts`  | 管理文件搜索、关键词匹配、结果高亮 |
| `session.ts` | 管理会话列表                       |
| `user.ts`    | 管理用户信息、登录状态             |

## 工具函数

### HTTP请求 (`utils/request.ts`)

基于 Axios 封装的请求模块，包含:

- 请求/响应拦截器
- 错误处理
- Token管理

### 命名规范

- 组件名: PascalCase (如 `ChatView.vue`)
- 组合式函数: camelCase (如 `useChatStore`)
- 类型定义: PascalCase + Type 后缀 (如 `ChatType`)
- 常量: UPPER_SNAKE_CASE
- 计划类md名称: snake_case (如`webworker_optimization_plan`)

### 文件组织

- 页面组件放在 `pages/` 目录
- 公共组件放在 `components/` 目录
- 类型定义放在 `stores/types/` 或 `utils/types/`
- 工具函数按功能分类放在 `utils/` 目录

### 环境变量

- `.env.development`: 开发环境配置
- `.env.production`: 生产环境配置

## 开发规范

- 尽量使用 TypeScript 类型定义，避免使用 `as` 类型断言
- 保留 _必要注释_，函数的参数和返回值不需注释
- 凡是写 _md文档_ 没指定放置位置的，都放在根目录的 `plans` 文件夹下

## 注意事项

- 生成代码后不必运行 `npm run lint` 和 `npm run format`，我会手动检查
