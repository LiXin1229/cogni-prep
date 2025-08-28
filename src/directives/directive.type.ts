import type { DirectiveBinding } from 'vue'

// 扩展 HTMLElement 类型，添加自定义属性
// declare global {
//   interface HTMLElement {
//     clickOutsideEvent?: (event: CustMouseEvent) => void
//   }
// }

export interface CustHTMLElement extends HTMLElement {
  clickOutsideEvent: (event: MouseEvent) => void
  _resizableHandler: (event: MouseEvent) => void
}

// 指令绑定的值类型（回调函数）
export interface ClickOutsideBinding extends DirectiveBinding {
  value: (event: MouseEvent) => void
}