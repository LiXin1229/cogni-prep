import type { CustHTMLElement } from './directive.type'

export const resizableDirective = {
  mounted(el: CustHTMLElement) {
    let init: number
    let initWidth : number
    const parent: HTMLElement | null = el.parentElement

    if (!parent) return

    const startResize = (e: MouseEvent) => {
      const end = e.clientX

      const newWidth = end - init + initWidth
      parent.style.width = newWidth + 'px'
    }

    const stopResize = () => {
      document.removeEventListener('mousemove', startResize)
      document.removeEventListener('mouseup', stopResize)
    }

    const resizeHandle = (e: MouseEvent) => {
      init = e.clientX
      initWidth = parent.offsetWidth

      document.addEventListener('mousemove', startResize)
      setTimeout(() => {
        document.addEventListener('mouseup', stopResize)
      }, 10)
    }

    el.addEventListener('mousedown', resizeHandle)
    el._resizableHandler = resizeHandle
  },
  unmounted(el: CustHTMLElement) {
    if (el._resizableHandler) el.removeEventListener('mousedown', el._resizableHandler)
  }
}