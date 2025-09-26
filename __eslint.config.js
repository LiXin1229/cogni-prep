import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import eslintPluginVue from 'eslint-plugin-vue'

export default [
  {
    ignores: ['node_modules', 'dist'],
  },

  eslint.configs.recommended, // js 推荐配置
  ...tseslint.configs.recommended, // ts 推荐配置
  ...eslintPluginVue.configs['flat/recommended'], // vue 推荐配置

  // js 规则
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      'no-unused-vars': 'warn',
    },
  },

  // 配置全局变量
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-multiple-empty-lines': 'error', // 禁止多个空行
      'vue/html-indent': ['error', 2], // 2格缩进
      semi: ['error', 'never'], // 禁止分号
    },
  },

  // vue 规则
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser, // typescript项目需要用到这个
        ecmaVersion: 'latest',
        ecmaFeatures: {
          jsx: true, // 允许在.vue文件中使用 JSX
        },
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off', // 组件名不强制使用驼峰命名
    },
  },

  // ts 规则
  {
    files: ['**/*.{ts,tsx,vue}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]
