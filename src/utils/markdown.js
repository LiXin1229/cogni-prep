import { marked } from 'marked';
import { markedHighlight } from "marked-highlight"
import hljs from 'highlight.js';
// import 'highlight.js/styles/github.css';
// import 'highlight.js/styles/base16/dracula.css'
// import 'highlight.js/styles/base16/github.css'
import 'highlight.js/styles/atom-one-light.css'

// 配置 marked 使用 highlight.js 高亮代码
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'shell'
    return hljs.highlight(code, { language }).value
  }
}))

// 处理代码块，添加头部标题
export const parseMarkdown = (content) => {
  // 先解析原始Markdown
  let html = marked(content)
  
  // 创建临时DOM元素处理HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
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
          language = cls.substring(9) // 提取language-后面的部分
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
  
  return tempDiv.innerHTML
}
