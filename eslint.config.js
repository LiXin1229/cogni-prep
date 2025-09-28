import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import eslintPluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['dist*', 'node_modules/*'],
  },

  eslint.configs.recommended, // js 推荐配置
  ...tseslint.configs.recommended, // ts 推荐配置
  ...eslintPluginVue.configs['flat/recommended'], // vue 推荐配置

  {
    languageOptions: {
      globals: {
        ...globals.browser, // 浏览器全局变量
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,vue}'],
    rules: {
      // js 规则
      'no-unused-vars': 'off', // 未使用变量
      'no-multiple-empty-lines': 'error', // 多个空行
      'vue/html-indent': ['error', 2], // 缩进
      'semi': ['error', 'never'], // 分号
      'comma-dangle': ['error', 'always-multiline'], // 强制使用尾逗号（多行情况下）
      'object-curly-spacing': ['error', 'always'], // 强制在大括号中使用空格
      'array-bracket-spacing': ['error', 'never'], // 方括号中不使用空格
      'eqeqeq': ['error', 'always'], // 必须使用 === 和 !==
      'no-var': 'error', // 不允许使用 var 声明变量

      // ts 规则
      '@typescript-eslint/no-unused-vars': 'warn', // 未使用变量
      '@typescript-eslint/no-explicit-any': 'off', // 使用 any 类型
      '@typescript-eslint/no-unsafe-function-type': 'off', // 使用 unsafe 函数类型

      // vue 规则
      'vue/multi-word-component-names': 'off', // 组件的驼峰命名
      'quotes': ['error', 'single', { // Script 中的字符串使用单引号，并允许反引号
        'avoidEscape': true,
        'allowTemplateLiterals': true,
      }],
      'vue/html-quotes': ['error', 'double'], // Vue 模板中使用双引号
    },
  },

  // vue 规则
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser, // typescript项目需要用到这个
        ecmaVersion: 'latest',
      },
    },
  },

  // 关闭与 Prettier 冲突的规则
  eslintConfigPrettier,
]
