import { purifyText } from './purifyText'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import 'highlight.js/styles/atom-one-light.css'
import copySvg from '@/assets/svgs/copy.svg'
import hljs from '@/utils/hljs'
// import hljs from 'highlight.js'

// 配置 marked 使用 highlight.js 高亮代码
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'shell'
      return hljs.highlight(code, { language }).value
    },
  })
)

// 处理代码块，添加头部标题
export const parseMarkdown = (content: string) => {
  if (typeof content !== 'string') {
    return ''
  }

  // 先解析原始Markdown
  const html = marked(content)

  const sanitizedHtml = purifyText(html as string)

  // 创建临时DOM元素处理HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = sanitizedHtml

  // 找到所有代码块
  const codeBlocks = tempDiv.querySelectorAll('pre')

  codeBlocks.forEach((block) => {
    // 获取语言信息（从code标签的class中提取）
    const codeElement = block.querySelector('code')
    let language = 'text'

    if (codeElement) {
      const classList = codeElement.className.split(' ')
      classList.forEach((cls) => {
        if (cls.startsWith('language-')) {
          // 提取并验证语言名称
          const lang = cls.substring(9).toLowerCase()
          // 只允许字母、数字和连字符
          if (/^[a-z0-9-]+$/.test(lang)) {
            language = lang
          }
        }
      })
    }

    // ##创建代码块头部##
    const header = document.createElement('div')
    header.className = 'code-block-header'

    const title = document.createElement('div')
    title.textContent = language

    const copyIcon = document.createElement('div')
    copyIcon.className = 'copy-btn'
    const image = document.createElement('img')
    image.src = copySvg
    image.className = 'icon'
    image.alt = '复制'
    // 防止图片加载失败的事件注入
    image.removeAttribute('onerror')
    copyIcon.appendChild(image)

    header.appendChild(title)
    header.appendChild(copyIcon)
    // ##创建代码块头部##

    // 将头部插入到pre内部，作为第一个元素
    if (block.firstChild) {
      block.insertBefore(header, block.firstChild)
    } else {
      block.appendChild(header)
    }
  })

  return purifyText(tempDiv.innerHTML)
}
