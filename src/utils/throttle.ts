import { throttle } from 'lodash-es'
import { onUnmounted, getCurrentInstance } from 'vue'

type ThrottleOptions = Parameters<typeof throttle>[2]

function useThrottle(fn: (...args: any[]) => any, delay: number, options?: ThrottleOptions) {
  const throttled = throttle(fn, delay, options)

  const instance = getCurrentInstance()
  if (instance) {
    onUnmounted(() => {
      throttled.cancel()
    })
  }

  return throttled
}

export default useThrottle
