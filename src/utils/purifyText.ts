import DOMPurify from 'dompurify'

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

export const purifyText = (text: string) => {
  return DOMPurify.sanitize(text, sanitizeOptions)
}
