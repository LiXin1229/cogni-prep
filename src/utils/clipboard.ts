import GouIcon from '@/assets/svgs/gou.svg'
import { ElMessage } from 'element-plus'

// 写入剪贴板（HTTP / HTTPS 通用）
export const writeInClipboard = (text: string, imgElement: HTMLImageElement) => {
  // 1. 现代浏览器 + HTTPS / localhost
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard
      .writeText(text)
      .then(() => onCopied(imgElement))
      .catch(() => onError())
  }

  // 2. 降级：execCommand('copy')（兼容 HTTP）
  return new Promise((_, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()

    try {
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)

      if (ok) {
        onCopied(imgElement)
      } else {
        onError()
        reject() // 明确调用 reject
      }
    } catch (e) {
      document.body.removeChild(textarea)
      onError()
      reject(e)
    }
  })
}

const onCopied = (img: HTMLImageElement) => {
  if (!img) return

  const originalSrc = img.src
  img.src = GouIcon
  setTimeout(() => {
    img.src = originalSrc
    img.classList.remove('copied-animation')
  }, 5000)
}

const onError = () => {
  ElMessage({ message: '复制失败', type: 'info' })
}
