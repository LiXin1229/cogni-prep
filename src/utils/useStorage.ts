import { ref, watch, computed } from 'vue'

type StorageMethodType = 'localStorage' | 'sessionStorage'

/**
 * 检测存储类型是否可用
 * @param {string} type - 存储类型，'localStorage' 或 'sessionStorage'
 * @returns {boolean} 是否可用
 */
const isStorageAvailable = (type: StorageMethodType) => {
  try {
    const storage = window[type]
    const key = `__storage_test__${Math.random().toString(36).slice(0, 2)}`
    
    storage.setItem(key, key)
    storage.removeItem(key)
    return true
  } catch (e) {
    // 存储不可用的情况（如隐私模式下）
    console.warn(`Web Storage (${type}) is not available:`, e)
    return false
  }
}

/**
 * 使用 Web Storage 的 Composition API
 * @param {string} key - 存储的键名
 * @param {any} defaultValue - 默认值
 * @param {'localStorage'|'sessionStorage'} storageType - 存储类型，默认为 localStorage
 * @returns {object} 包含存储值、设置值、移除值等方法的对象
 */
export const useStorage = <T>(
  key: string,
  defaultValue: T,
  storageType: StorageMethodType = 'localStorage'
) => {
  // 检查存储类型是否可用
  const storageAvailable = isStorageAvailable(storageType)
  const storage: Storage | null = storageAvailable ? window[storageType] : null
  
  // 从存储中获取初始值
  const getStoredValue: () => T = () => {
    if (!storage) return defaultValue
    
    try {
      const storedValue = storage.getItem(key)
      if (storedValue === null) return defaultValue
      
      // 尝试解析 JSON，处理非 JSON 字符串的情况
      try {
        return JSON.parse(storedValue)
      } catch {
        // 如果解析失败，直接返回原始字符串
        return storedValue
      }
    } catch (e) {
      console.error('Error reading from storage:', e)
      return defaultValue
    }
  }
  
  // 创建响应式引用
  const value = ref(getStoredValue())
  
  // 当值变化时同步到存储
  watch(
    value,
    (newValue) => {
      if (!storage) return
      
      try {
        if (newValue === undefined) {
          storage.removeItem(key)
        } else {
          // 对于基本类型直接存储，对象和数组转为 JSON
          const valueToStore = typeof newValue === 'string' 
            ? newValue 
            : JSON.stringify(newValue)
          storage.setItem(key, valueToStore)
        }
      } catch (e) {
        console.error('Error writing to storage:', e)
      }
    },
    { deep: true } // 深度监听，处理对象和数组的变化
  )
  
  // 移除存储的方法
  const remove = () => {
    if (storage) {
      storage.removeItem(key);
      value.value = defaultValue;
    }
  }
  
  // 检查是否存在该键
  const has = computed(() => {
    if (!storage) return false
    return storage.getItem(key) !== null
  })
  
  // 清空所有存储（谨慎使用）
  const clearAll = () => {
    if (storage) {
      storage.clear()
      value.value = defaultValue
    }
  }
  
  return {
    value,
    remove,
    has,
    clearAll
  }
}

// 专门用于 localStorage 的快捷方式
export const useLocalStorage = <T>(key: string, defaultValue: T) => {
  return useStorage<T>(key, defaultValue, 'localStorage')
}

// 专门用于 sessionStorage 的快捷方式
export const useSessionStorage = <T>(key: string, defaultValue: T) => {
  return useStorage<T>(key, defaultValue, 'sessionStorage')
}
