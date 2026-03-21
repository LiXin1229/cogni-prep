/**
 * 高亮文本中的关键词
 * @param text 原始文本
 * @param keyword 关键词
 * @param className 高亮样式类名
 * @returns 高亮后的 HTML 字符串
 */
export const highlightKeyword = (text: string, keyword: string, className = 'highlight'): string => {
  if (!keyword.trim()) return text
  
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const parts: string[] = []
  let lastIndex = 0
  let index = 0

  while ((index = lowerText.indexOf(lowerKeyword, lastIndex)) !== -1) {
    // 添加匹配前的文本
    if (index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, index)))
    }
    // 添加高亮的匹配文本
    parts.push(`<span class="${className}">${escapeHtml(text.slice(index, index + keyword.length))}</span>`)
    lastIndex = index + keyword.length
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)))
  }

  return parts.join('')
}

/**
 * HTML 转义
 */
const escapeHtml = (text: string): string => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 获取高亮文本的纯文本版本（去除 HTML 标签）
 */
export const getPlainText = (html: string): string => {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}