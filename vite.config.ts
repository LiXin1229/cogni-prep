import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

import { fileURLToPath, URL } from 'node:url'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
    viteCompression({
      algorithm: 'gzip', // 也可 brotli
      ext: '.gz',
      threshold: 10240, // 大于10k才压缩
    }),
    visualizer({
      emitFile: false, // 不将分析文件输出到dist目录，直接在项目根目录生成
      filename: 'bundle-analysis.html', // 分析报告文件名
      open: true, // 打包完成后自动打开报告页面
      gzipSize: true, // 显示gzip压缩后的体积（重点！B端项目建议开启gzip）
      brotliSize: true, // 显示brotli压缩后的体积
      template: 'list',
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'decode-named-character-reference': resolve(__dirname, 'node_modules/decode-named-character-reference/index.js')
    },
  },
  server: {
    hmr: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  test: {
    include: ['**/*.spec.ts'],
    globals: true,
  },
})
