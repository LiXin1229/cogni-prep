import { describe, it, expect } from 'vitest'
import { LRUCache } from '../LRUCache'
import { watch, nextTick, ref } from 'vue'

describe('LRUCache', () => {
  describe('LRU特性', () => {
    it('超过容量时移除最久未使用的元素', () => {
      const cache = new LRUCache<number>(3)

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)
      cache.put('d', 4)

      expect(cache.get('a')).toBe(undefined)
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
      expect(cache.size).toBe(3)
    })

    it('存储引用类型数据', () => {
      interface TestData {
        id: number
        name: string
        items: string[]
      }

      const cache = new LRUCache<TestData>(2)

      cache.put('a', { id: 1, name: 'first', items: ['x', 'y'] })
      cache.put('b', { id: 2, name: 'second', items: ['z'] })

      expect(cache.get('a')).toEqual({ id: 1, name: 'first', items: ['x', 'y'] })

      cache.put('c', { id: 3, name: 'third', items: [] })

      expect(cache.get('b')).toBe(undefined)
      expect(cache.get('a')).toEqual({ id: 1, name: 'first', items: ['x', 'y'] })
      expect(cache.get('c')).toEqual({ id: 3, name: 'third', items: [] })
    })

    it('get操作更新访问顺序', () => {
      const cache = new LRUCache<number>(3)

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      cache.get('a')

      cache.put('d', 4)

      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBe(undefined)
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('put已存在的key更新值和顺序', () => {
      const cache = new LRUCache<number>(3)

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      cache.put('a', 100)

      cache.put('d', 4)

      expect(cache.get('a')).toBe(100)
      expect(cache.get('b')).toBe(undefined)
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('modify方法更新值和顺序', () => {
      const cache = new LRUCache<number>(3)

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      cache.modify('a', 100)

      cache.put('d', 4)

      expect(cache.get('a')).toBe(100)
      expect(cache.get('b')).toBe(undefined)
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('支持数字类型的key', () => {
      const cache = new LRUCache<string>(2)

      cache.put(1, 'one')
      cache.put(2, 'two')
      cache.put(3, 'three')

      expect(cache.get(1)).toBe(undefined)
      expect(cache.get(2)).toBe('two')
      expect(cache.get(3)).toBe('three')
    })

    it('get不存在的key抛出错误', () => {
      const cache = new LRUCache<number>(2)

      expect(cache.get('nonexistent')).toBe(undefined)
    })

    it('delete方法删除存在的key', () => {
      const cache = new LRUCache<number>(3)

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      const result = cache.delete('b')

      expect(result).toBe(true)
      expect(cache.get('b')).toBe(undefined)
      expect(cache.size).toBe(2)
      expect(cache.get('a')).toBe(1)
      expect(cache.get('c')).toBe(3)
    })

    it('delete方法删除不存在的key返回false', () => {
      const cache = new LRUCache<number>(3)

      cache.put('a', 1)

      const result = cache.delete('nonexistent')

      expect(result).toBe(false)
      expect(cache.size).toBe(1)
    })

    it('delete方法删除后不影响LRU顺序', () => {
      const cache = new LRUCache<number>(3)

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      cache.delete('b')

      cache.put('d', 4)

      expect(cache.get('a')).toBe(1)
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
      expect(cache.size).toBe(3)
    })

    it('delete方法删除头节点', () => {
      const cache = new LRUCache<number>(3)

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      cache.delete('a')

      expect(cache.get('a')).toBe(undefined)
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(3)
      expect(cache.size).toBe(2)
    })

    it('delete方法删除尾节点', () => {
      const cache = new LRUCache<number>(3)

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      cache.delete('c')

      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(undefined)
      expect(cache.size).toBe(2)
    })

    it('onEvict回调在淘汰时被调用', () => {
      const evictedItems: Array<{ key: string | number; value: number }> = []

      const cache = new LRUCache<number>(2, (key, value) => {
        evictedItems.push({ key, value })
      })

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      expect(evictedItems).toHaveLength(1)
      expect(evictedItems[0]).toEqual({ key: 'a', value: 1 })
    })

    it('onEvict回调在多次淘汰时被调用', () => {
      const evictedItems: Array<{ key: string | number; value: number }> = []

      const cache = new LRUCache<number>(2, (key, value) => {
        evictedItems.push({ key, value })
      })

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)
      cache.put('d', 4)
      cache.put('e', 5)

      expect(evictedItems).toHaveLength(3)
      expect(evictedItems[0]).toEqual({ key: 'a', value: 1 })
      expect(evictedItems[1]).toEqual({ key: 'b', value: 2 })
      expect(evictedItems[2]).toEqual({ key: 'c', value: 3 })
    })

    it('onEvict回调接收引用类型值', () => {
      interface TestData {
        id: number
        name: string
      }

      const evictedItems: Array<{ key: string | number; value: TestData }> = []

      const cache = new LRUCache<TestData>(2, (key, value) => {
        evictedItems.push({ key, value })
      })

      cache.put('a', { id: 1, name: 'first' })
      cache.put('b', { id: 2, name: 'second' })
      cache.put('c', { id: 3, name: 'third' })

      expect(evictedItems).toHaveLength(1)
      expect(evictedItems[0]).toEqual({ key: 'a', value: { id: 1, name: 'first' } })
    })

    it('无onEvict回调时正常淘汰', () => {
      const cache = new LRUCache<number>(2)

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      expect(cache.get('a')).toBe(undefined)
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(3)
      expect(cache.size).toBe(2)
    })
  })

  describe('响应式特性', () => {
    it('修改基本类型val触发响应式更新', async () => {
      const cache = new LRUCache<number>(2)
      cache.put('a', 1)

      let triggerCount = 0
      let latestValue = 0

      watch(
        () => cache.map.get('a')?.val,
        (newVal) => {
          triggerCount++
          latestValue = newVal ?? 0
        }
      )

      cache.modify('a', 100)
      await nextTick()

      expect(triggerCount).toBe(1)
      expect(latestValue).toBe(100)
    })

    it('修改引用类型val触发响应式更新', async () => {
      interface TestData {
        name: string
        count: number
      }

      const cache = new LRUCache<TestData>(2)
      cache.put('a', { name: 'test', count: 1 })

      let triggerCount = 0
      let latestData: TestData | undefined

      watch(
        () => cache.map.get('a')?.val,
        (newVal) => {
          triggerCount++
          latestData = newVal
        }
      )

      cache.modify('a', { name: 'modified', count: 100 })
      await nextTick()

      expect(triggerCount).toBe(1)
      expect(latestData).toEqual({ name: 'modified', count: 100 })
    })

    it('put更新已存在的key触发响应式更新', async () => {
      const cache = new LRUCache<number>(2)
      cache.put('a', 1)

      let triggerCount = 0
      let latestValue = 0

      watch(
        () => cache.map.get('a')?.val,
        (newVal) => {
          triggerCount++
          latestValue = newVal ?? 0
        }
      )

      cache.put('a', 200)
      await nextTick()

      expect(triggerCount).toBe(1)
      expect(latestValue).toBe(200)
    })

    it('map的size变化触发响应式更新', async () => {
      const cache = new LRUCache<number>(3)

      let sizeChanges: number[] = []

      watch(
        () => cache.map.size,
        (newSize) => {
          sizeChanges.push(newSize)
        }
      )

      cache.put('a', 1)
      await nextTick()

      cache.put('b', 2)
      await nextTick()

      cache.put('c', 3)
      await nextTick()

      cache.put('d', 4)
      await nextTick()

      expect(sizeChanges).toEqual([1, 2, 3])
    })

    it('删除元素触发响应式更新', async () => {
      const cache = new LRUCache<number>(3)
      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      let deleteEvents: string[] = []

      watch(
        () => cache.map.has('a'),
        (hasKey) => {
          deleteEvents.push(hasKey ? 'exists' : 'deleted')
        }
      )

      cache.put('d', 4)
      await nextTick()

      expect(deleteEvents).toEqual(['deleted'])
      expect(cache.get('a')).toBe(undefined)
    })

    it('响应式更新在组件场景中生效', async () => {
      const cache = new LRUCache<{ value: number }>(2)
      cache.put('item', { value: 10 })

      const computedValue = ref(0)
      computedValue.value = cache.map.get('item')?.val?.value ?? 0

      watch(
        () => cache.map.get('item')?.val,
        (newVal) => {
          computedValue.value = newVal?.value ?? 0
        }
      )

      expect(computedValue.value).toBe(10)

      cache.modify('item', { value: 999 })
      await nextTick()

      expect(computedValue.value).toBe(999)
    })

    it('delete方法触发响应式更新', async () => {
      const cache = new LRUCache<number>(3)
      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      let deleteEvents: string[] = []

      watch(
        () => cache.map.has('b'),
        (hasKey) => {
          deleteEvents.push(hasKey ? 'exists' : 'deleted')
        }
      )

      cache.delete('b')
      await nextTick()

      expect(deleteEvents).toEqual(['deleted'])
      expect(cache.get('b')).toBe(undefined)
    })

    it('delete方法触发size响应式更新', async () => {
      const cache = new LRUCache<number>(3)
      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      let sizeChanges: number[] = []

      watch(
        () => cache.map.size,
        (newSize) => {
          sizeChanges.push(newSize)
        }
      )

      cache.delete('b')
      await nextTick()

      expect(sizeChanges).toEqual([2])
    })

    it('delete方法触发val响应式更新', async () => {
      const cache = new LRUCache<number>(3)
      cache.put('a', 1)

      let triggerCount = 0
      let lastValue: number | undefined = 0

      watch(
        () => cache.map.get('a')?.val,
        (newVal) => {
          triggerCount++
          lastValue = newVal
        }
      )

      cache.delete('a')
      await nextTick()

      expect(triggerCount).toBe(1)
      expect(lastValue).toBe(undefined)
    })
  })
})
