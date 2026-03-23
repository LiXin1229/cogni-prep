import { debounce } from 'lodash-es'
import { onUnmounted, getCurrentInstance } from 'vue'

type DebounceOptions = Parameters<typeof debounce>[2]

export function useDebounce(fn: (...args: any[]) => any, delay: number, options?: DebounceOptions) {
  const debounced = debounce(fn, delay, options)

  const instance = getCurrentInstance()
  if (instance) {
    onUnmounted(() => {
      debounced.cancel()
    })
  }

  return debounced
}
