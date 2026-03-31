import { reactive } from 'vue'

export type MapKey = string | number

export type EvictCallback<T> = (key: MapKey, value: T) => void

export class LRUCache<T> {
  list = new ListNode<T>()
  tail: ListNode<T> = this.list
  map: Map<MapKey, ListNode<T>>
  size = 0
  capacity: number
  private onEvict?: EvictCallback<T>

  constructor(capacity: number, onEvict?: EvictCallback<T>) {
    this.map = reactive(new Map<MapKey, ListNode<T>>()) as Map<MapKey, ListNode<T>>
    this.capacity = capacity
    this.onEvict = onEvict
  }

  put(key: MapKey, value: T) {
    const existing = this.map.get(key)
    if (existing) {
      existing.val = value
      this.update(existing)
      return
    }

    if (this.size >= this.capacity) {
      this.remove()
    }
    const node = new ListNode(value, key)

    // 添加到链表尾部
    node.prev = this.tail
    this.tail.next = node
    this.tail = node

    this.map.set(key, node)
    this.size++
  }

  get(key: MapKey) {
    const node = this.map.get(key)
    if (node) {
      this.update(node)
      return node.val
    }
  }

  peek(key: MapKey) {
    const node = this.map.get(key)
    if (node) {
      return node.val
    }
  }

  has(key: MapKey) {
    return this.map.has(key)
  }

  modify(key: MapKey, value: T) {
    const node = this.map.get(key)
    if (node) {
      node.val = value
      this.update(node)
    }
  }

  delete(key: MapKey): boolean {
    const node = this.map.get(key)
    if (!node) {
      return false
    }

    const prevNode = node.prev
    const nextNode = node.next

    if (prevNode) {
      prevNode.next = nextNode
    }
    if (nextNode) {
      nextNode.prev = prevNode
    }

    if (node === this.tail) {
      this.tail = prevNode ?? this.list
    }

    this.map.delete(key)
    this.size--
    return true
  }

  remove() {
    const head = this.list
    const first = head.next
    if (first) {
      // 从链表中移除第一个节点
      if (first.key !== undefined && first.val !== undefined) {
        this.onEvict?.(first.key, first.val)
      }

      head.next = first.next
      if (first.next) {
        first.next.prev = head
      } else {
        // 如果 first 是尾节点，更新 tail
        this.tail = head
      }

      if (first.key !== undefined) {
        this.map.delete(first.key)
      }
      this.size--
    }
  }

  update(node: ListNode<T>) {
    // 如果节点已经在尾部，不需要移动
    if (node === this.tail) {
      return
    }

    const prevNode = node.prev
    const nextNode = node.next

    // 从当前位置移除节点
    if (prevNode) {
      prevNode.next = nextNode
    }
    if (nextNode) {
      nextNode.prev = prevNode
    }

    // 将节点添加到尾部
    node.prev = this.tail
    node.next = null
    this.tail.next = node
    this.tail = node
  }
}

class ListNode<T> {
  key?: MapKey
  val?: T
  prev: ListNode<T> | null = null
  next: ListNode<T> | null = null

  constructor(val?: T, key?: MapKey) {
    this.val = val
    this.key = key
  }
}
