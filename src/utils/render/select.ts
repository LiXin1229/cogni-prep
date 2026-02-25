import { reactive, ref, type Ref } from 'vue'
import type { Node } from './ast'
import type { EditingNodeMap, KeyPositionMaps } from './index'

export type PositionInfo = {
  offset: number
  line: number
  column: number
}

export type Position = {
  start: PositionInfo
  end: PositionInfo
}

export interface SelectionPosition {
  startOffset: number
  endOffset: number
}

export type Selector = {
  position: SelectionPosition
  visualColumn: Ref<number>
  cursorOffset: Ref<number>
  cursorRendered: boolean
  setCursorOffset: (offset: number) => void
  setPosition: (startOffset: number, endOffset: number) => void
  setStartNode: (node: Node) => void
  setEndNode: (node: Node) => void
}

export function createSelector(
  editingNodeMap: EditingNodeMap,
  keyPositionMaps: KeyPositionMaps
): Selector {
  // 视觉列号
  const visualColumn = ref(0)

  // 光标 offset
  const cursorOffset = ref(-1)

  const setCursorOffset = (offset: number) => {
    cursorOffset.value = offset
  }

  // 光标是否渲染 (保证光标唯一)
  let cursorRendered = false

  const position = reactive({ startOffset: -1, endOffset: -1 })

  let startNode: Node | null = null

  const setPosition = (startOffset: number, endOffset: number) => {
    position.startOffset = startOffset
    position.endOffset = endOffset
    // console.log(`setPosition[${startOffset}, ${endOffset}]`)
    // console.log(keyPositionMaps)
  }

  // 设置光标起始节点
  const setStartNode = (node: Node | null) => {
    startNode = node
  }

  // 设置光标结束节点
  const setEndNode = (endNode: Node) => {
    const selection = window.getSelection() as Selection
    const { anchorOffset, focusOffset, direction } = selection
    // console.log('setEndNode: ', selection)

    const startOffset = (startNode?.position.start.offset ?? 0) + anchorOffset
    const endOffset = endNode.position.start.offset + focusOffset

    switch (direction) {
      case 'none': // 点击
        setCursorOffset(endOffset)
        setPosition(startOffset, endOffset)

        break
      case 'forward': // 从前往后划
        setPosition(startOffset, endOffset)
        break
      case 'backward': // 从后往前划
        setPosition(endOffset, startNode !== null ? startOffset : endOffset)
    }

    setStartNode(null) // 重置起始节点

    // 如果是选择区间则重置光标offset
    if (position.startOffset !== position.endOffset) {
      const isEditing = editingNodeMap.value.get(endNode.nodeId)
      if (!isEditing) {
        setCursorOffset(-1)
      }
    }

    unEditingBlockCode()

    // console.log(
    //   `select[${position.startOffset}, ${position.endOffset}] cursor[${cursorOffset.value}]`
    // )
    // console.log('endNode: ', endNode)
    return position
  }

  // 取消代码块编辑状态
  function unEditingBlockCode() {
    for (const [nodeId, pos] of keyPositionMaps.blockCode.entries()) {
      // console.log('pos', nodeId, pos)
      const start = pos.content.start.offset
      const end = pos.content.end.offset
      // console.log('keyPosition', start, end)
      if (cursorOffset.value < start || cursorOffset.value > end) {
        editingNodeMap.value.set(nodeId, false)
      }
    }
  }

  return {
    position,
    visualColumn,
    cursorOffset,
    cursorRendered,
    setCursorOffset,
    setPosition,
    setStartNode,
    setEndNode,
  }
}
