# 方案 1：配置 Vite 排除 remark 预打包

## 问题原因

Vite 默认会将依赖预打包（pre-bundle），`remark` 在预打包过程中引入了访问 `document` 的代码。Web Worker 环境中没有 DOM API，导致 `ReferenceError: document is not defined`。

## 解决方案

配置 Vite 排除 `remark` 的预打包，让 Worker 直接使用原始 ESM 模块。

## 实施步骤

### Step 1: 修改 vite.config.ts

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    // 排除 remark，避免预打包时引入 DOM 依赖
    exclude: ['remark']
  },
  worker: {
    // Worker 构建配置
    rollupOptions: {
      output: {
        // 确保 Worker 中的模块正确解析
        format: 'es'
      }
    }
  }
})
```

### Step 2: 清除 Vite 缓存

```bash
# 删除 node_modules/.vite 缓存目录
rm -rf node_modules/.vite
```

### Step 3: 重启开发服务器

```bash
npm run dev
```

## 原理说明

```
┌─────────────────────────────────────────────────────────────┐
│                    Vite 预打包流程                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  默认行为:                                                   │
│  remark → 预打包 → chunk-xxx.js (包含 DOM 代码) → Worker 报错 │
│                                                             │
│  排除后:                                                     │
│  remark → 跳过预打包 → 原始 ESM 模块 → Worker 正常加载        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 潜在问题

1. **冷启动变慢**：排除预打包后，首次加载可能稍慢
2. **依赖链问题**：如果 `remark` 的子依赖也有 DOM 依赖，可能需要一并排除

### 扩展配置（如有需要）

```typescript
export default defineConfig({
  optimizeDeps: {
    exclude: ['remark', 'unified', 'remark-parse']
  }
})
```

## 验证方法

1. 打开浏览器控制台，确认无 `document is not defined` 错误
2. 在编辑器中输入文本，确认解析正常工作
3. 检查 Network 面板，确认 Worker 文件加载成功

## 回滚方案

如果此方案无效，可以：
1. 恢复 `vite.config.ts` 配置
2. 尝试方案 4（requestIdleCallback）
