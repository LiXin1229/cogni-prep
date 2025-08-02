import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { markedHighlight } from "marked-highlight"
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-light.css'

// 配置 marked 使用 highlight.js 高亮代码
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'shell'
    return hljs.highlight(code, { language }).value
  }
}))

// 配置DOMPurify允许的标签和属性，限制安全范围
const sanitizeOptions = {
  // 允许的HTML标签
  ADD_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 
             'strong', 'em', 'code', 'pre', 'blockquote', 'br', 'table', 
             'thead', 'tbody', 'tr', 'th', 'td'],
  // 允许的属性
  ADD_ATTR: ['class', 'href', 'src', 'alt', 'title'],
  // 禁止的标签
  FORBID_TAGS: ['script', 'iframe', 'video', 'audio', 'style'],
  // 禁止的属性
  FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'],
  // 禁止未知协议，防止javascript:等危险协议
  ALLOW_UNKNOWN_PROTOCOLS: false,
  // 净化URL，确保链接安全
  SANITIZE_URI: true
}

// 处理代码块，添加头部标题
export const parseMarkdown = (content) => {
  if (typeof content !== 'string') {
    return '';
  }

  // 先解析原始Markdown
  let html = marked(content)
  
  const sanitizedHtml = DOMPurify.sanitize(html, sanitizeOptions)

  // 创建临时DOM元素处理HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = sanitizedHtml
  
  // 找到所有代码块
  const codeBlocks = tempDiv.querySelectorAll('pre')
  
  codeBlocks.forEach((block) => {
    // 获取语言信息（从code标签的class中提取）
    // 获取语言信息（从code标签的class中提取）
    const codeElement = block.querySelector('code')
    let language = 'text'

    if (codeElement) {
      const classList = codeElement.className.split(' ')
      classList.forEach(cls => {
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
    image.src = '/src/assets/svgs/copy.svg'
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
  
  return DOMPurify.sanitize(tempDiv.innerHTML, sanitizeOptions)
}
