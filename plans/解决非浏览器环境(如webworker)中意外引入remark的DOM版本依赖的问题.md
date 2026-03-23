## 问题描述

在 `remark.worker.ts` 中

```ts
import { remark } from 'remark'
import type { Root } from 'mdast'

interface ParseTask {
  id: number
  markdown: string
}

interface ParseResult {
  id: number
  ast: Root | null
  error: string | null
}

self.onmessage = (event: MessageEvent<ParseTask>) => {
  const { id, markdown } = event.data

  try {
    const ast = remark().parse(markdown) as Root
    const result: ParseResult = { id, ast, error: null }
    self.postMessage(result)
  } catch (error: any) {
    const result: ParseResult = { id, ast: null, error: error.message }
    self.postMessage(result)
  }
}
```

#### 报错

![](D:\Projects\InterviewWebsite\cogni-prep-ts\resource\意外引入remark的DOM版本依赖.png)



## 问题根源

`decode-named-character-reference` 是 `mdast-util-from-markdown` 的依赖

它有两个版本：

**index.js：**纯 JS（使用查找表）

**index.dom.js：**使用 document.createElement('i')

该包的 exports 配置：

```json
"exports": {
  "worker": "./index.js",      // Worker 应该用这个
  "browser": "./index.dom.js", // 浏览器用这个
  "default": "./index.js"
}
```



## 解决方法

**vite 配置**

强制使用默认版本

```ts
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'decode-named-character-reference': resolve(__dirname, 'node_modules/decode-named-character-reference/index.js')
    },
  }
})
```

