import { ref, onUnmounted, getCurrentInstance } from 'vue'

export const useThrottle = () => {
  // 节流定时器
  const timer = ref<number | null>(null)
  // 上一次执行的时间戳
  const lastInvokeTime = ref(0)

  // 组件卸载时自动清理
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
   * 节流函数
   * @param fn        需要节流的函数
   * @param delay     节流间隔（ms）
   * @param options   可选配置
   *   - leading:  是否在节流开始前立即执行第一次，默认 true
   *   - trailing: 是否在节流结束后追加执行一次，默认 true
   */
  const throttle = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
    options: OptionsType = {}
  ) => {
    const { leading = true, trailing = true } = options

    return (...args: Parameters<T>) => {
      const now = Date.now()

      // 首次执行
      if (!lastInvokeTime.value) {
        lastInvokeTime.value = now
        if (leading) fn(...args)
        return
      }

      // 剩余等待时间
      const remaining = delay - (now - lastInvokeTime.value)

      // 时间已到，直接执行
      if (remaining <= 0) {
        lastInvokeTime.value = now
        if (leading) fn(...args)
        return
      }

      // trailing：最后一次触发后追加一次
      if (trailing && timer.value === null) {
        timer.value = window.setTimeout(() => {
          lastInvokeTime.value = Date.now()
          timer.value = null
          fn(...args)
        }, remaining)
      }
    }
  }

  return {
    throttle
  }
}

interface OptionsType {
  leading?: boolean
  trailing?: boolean
}
