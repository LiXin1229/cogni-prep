import { ref, getCurrentInstance, onUnmounted } from 'vue'

export const useDebounce = () => {
  const timer = ref<number | null>(null) // 用于存储定时器ID

  // 获取当前组件实例，仅在组件环境中注册卸载钩子
  const instance = getCurrentInstance()
  if (instance) {
    onUnmounted(() => {
      if (timer.value) {
        clearTimeout(timer.value)
        timer.value = null
      }
    })
  }

  /**
   * 带立即执行功能的防抖函数
   * @param {Function} func - 需要防抖的函数
   * @param {number} delay - 防抖延迟时间（毫秒）
   * @param {boolean} [immediate=false] - 是否立即执行（第一次触发时直接执行，后续防抖）
   * @returns {Function} 包装后的防抖函数
   */
  const debounce = (func: Function, delay: number, immediate = false) => {
    // 校验func必须是函数
    if (typeof func !== 'function') {
      throw new Error('debounce的第一个参数必须是函数')
    }

    return (...args: any[]) => {
      // 每次触发时先清除之前的定时器（核心防抖逻辑）
      if (timer.value) {
        clearTimeout(timer.value)
      }

      // 立即执行逻辑：如果是第一次触发且需要立即执行
      if (immediate && !timer.value) {
        func.apply(this, args) // 立即执行原函数
      }

      // 设置新的定时器：延迟后执行（如果是立即执行，这里是后续触发的防抖逻辑）
      timer.value = setTimeout(() => {
        // 如果不需要立即执行，或需要延迟执行后续触发的逻辑
        if (!immediate) {
          func.apply(this, args)
        }
        // 执行后清空定时器（避免immediate模式下误判“是否第一次触发”）
        timer.value = null
      }, delay)
    }
  }

  return {
    debounce
  }
}
