import { ref } from 'vue'
import { hasOwn } from './utils/general'
import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/atom-one-light.css'

import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import java from 'highlight.js/lib/languages/java'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('html', html)
hljs.registerLanguage('css', css)
hljs.registerLanguage('java', java)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', html)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('vue', html)

export function createHljs() {
  return {
    loadedLangs,
    highlight,
  }
}

const loadedLangs = ref<string[]>([])

export function highlight(code: string, lang: string) {
  if (hljs.getLanguage(lang)) {
    return hljs.highlight(code, { language: lang }).value
  }
  if (hasOwn(langImportMap, lang)) {
    loadLang(lang).then((module) => {
      hljs.registerLanguage(lang, module.default)
      loadedLangs.value.push(lang)
    })
  }
}

export const langImportMap = {
  rust: () => import('highlight.js/lib/languages/rust'),
  go: () => import('highlight.js/lib/languages/go'),
  c: () => import('highlight.js/lib/languages/c'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  php: () => import('highlight.js/lib/languages/php'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  swift: () => import('highlight.js/lib/languages/swift'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  r: () => import('highlight.js/lib/languages/r'),
  matlab: () => import('highlight.js/lib/languages/matlab'),
  sql: () => import('highlight.js/lib/languages/sql'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
  python: () => import('highlight.js/lib/languages/python'),
}

export async function loadLang(lang: keyof typeof langImportMap) {
  const loader = langImportMap[lang]
  return await loader()
}
