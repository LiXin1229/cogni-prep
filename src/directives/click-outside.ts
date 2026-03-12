import type { Directive } from 'vue'

interface CustHTMLElement extends HTMLElement {
  clickOutsideEvent: (event: MouseEvent) => void
  _resizableHandler: (event: MouseEvent) => void
}

export const clickOutside: Directive<CustHTMLElement, (e: MouseEvent) => void> = {
  beforeMount(el, binding) {
    el.clickOutsideEvent = (event: MouseEvent) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event) // 执行绑定的回调函数
      }
    }
    document.addEventListener('click', el.clickOutsideEvent as EventListener)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent as EventListener)
  },
}
