import type { Directive } from 'vue'
import { isMobileDevice } from '@/utils/device' // 你之前写的检测函数

const isMobile = isMobileDevice()

export const mobileHidden: Directive<HTMLElement> = {
  mounted(el) {
    if (isMobile) {
      el.style.display = 'none'
      el.remove()
    }
  },
  updated(el) {
    // 移动端 UA 不会变，通常不需要 updated，但保留更健壮
    if (isMobile) {
      el.style.display = 'none'
      el.remove()
    }
  },
}
