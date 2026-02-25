import { ref, type Ref } from 'vue'
import type { Selector } from './select'
import type { BlockCodePosInfo, KeyPositionMaps } from '.'
import { setupHistoryStack } from './history'

export type KeyCharTypes = 'strong' | 'emphasis' | 'blockCode' | 'inlineCode'

export type Editor = {
  source: Ref<string>
  handleKeydown: (e: KeyboardEvent) => void
  handlePaste: (e: ClipboardEvent) => void
  handleInsert: (key: string) => void
  handleDelete: () => void
  handleCompositionUpdate: (startOffset: number, composingText: string) => void
  record: () => void
  handleInsertKeyChars: (type: KeyCharTypes) => void
}

export function createEditor(
  input: string,
  selector: Selector,
  keyPositionMaps: KeyPositionMaps
): Editor {
  const source = ref(input)

  const historyStack = setupHistoryStack(source, selector)
  const record = historyStack.record

  const handleKeydown = (e: KeyboardEvent) => {
    // console.log('handleKeydown: ', e)
    if (e.ctrlKey) {
      switch (e.key) {
        case 'c':
          handleCopy()
          break
        case 'z':
          historyStack.undo()
          break
        case 'y':
          historyStack.redo()
          break
        case 'i':
          handleInsertKeyChars('blockCode')
          break
      }
      return
    }

    switch (e.key) {
      case 'Backspace':
        handleDelete()
        break
      case 'Enter':
        handleInsert('\n')
        break
      case 'Tab':
        e.preventDefault()
        handleInsert('  ')
        break
      // case ' ':
      //   e.preventDefault()
      //   handleInsert(' ')
      //   break
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault()
        handleArrow(e.key)
        break
      // case 'Process':
      //   console.log('Process: ', e.code)
      //   handleArrow(e.code)
      //   break
      case 'Escape':
      case 'Home':
      case 'End':
      case 'Delete':
      case 'Shift':
      case 'Control':
      case 'Alt':
      case 'Meta':
        break
      default:
        handleInsert(e.key)
    }
  }

  const handleInsertKeyChars = (type: KeyCharTypes) => {
    const { startOffset, endOffset } = selector.position

    switch (type) {
      case 'blockCode':
        // handleInsert('\n```\n \n```\n')
        // insert(' \n```\n')
        insertBlockCode()
        break
      case 'strong':
        insert('**')
        break
      case 'emphasis':
        insert('*')
        break
      case 'inlineCode':
        insert('`')
        break
    }

    function insert(key: string) {
      const before = source.value.slice(0, startOffset)
      const selected = source.value.slice(startOffset, endOffset)
      const after = source.value.slice(endOffset)
      source.value = before + key + selected + key + after

      const newOffset = endOffset + key.length * 2
      selector.setPosition(newOffset, newOffset)
      selector.setCursorOffset(newOffset)

      record() // 记录状态
    }

    function insertBlockCode() {
      const before = source.value.slice(0, startOffset)
      const selected = source.value.slice(startOffset, endOffset)
      const after = source.value.slice(endOffset)
      source.value = before + '\n```\n' + (selected || ' ') + '\n```\n' + after

      const newOffset = startOffset + 5
      selector.setPosition(newOffset, newOffset)
      selector.setCursorOffset(newOffset)

      record() // 记录状态
    }
  }

  const handleCompositionUpdate = (startOffset: number, composingText: string) => {
    source.value =
      source.value.slice(0, startOffset) +
      composingText +
      source.value.slice(selector.cursorOffset.value)

    // 更新光标到拼音末尾
    const newOffset = startOffset + composingText.length
    selector.setCursorOffset(newOffset)
    selector.setPosition(newOffset, newOffset)
  }

  const handleDelete = () => {
    const {
      position: { startOffset, endOffset },
    } = selector
    // console.log(startOffset, endOffset)

    if (startOffset === 0 && endOffset === 0) {
      return
    }
    if (startOffset === -1 && endOffset === -1) {
      return
    } else if (startOffset === endOffset) {
      // 光标删除
      if (checkDeleteBlockCode('cursor')) return // 检查是否在代码块特殊位置

      source.value = source.value.slice(0, endOffset - 1) + source.value.slice(endOffset)
      selector.setPosition(startOffset - 1, endOffset - 1)
      selector.setCursorOffset(selector.cursorOffset.value - 1)
    } else {
      // 区域删除
      if (checkDeleteBlockCode('range')) return

      source.value = source.value.slice(0, startOffset) + source.value.slice(endOffset)
      selector.setPosition(startOffset, startOffset)
      selector.setCursorOffset(startOffset)
    }

    // console.log(startOffset, endOffset)
    // 记录状态
    record()
  }

  function checkDeleteBlockCode(type: 'cursor' | 'range') {
    const {
      position: { startOffset, endOffset },
      cursorOffset,
    } = selector
    if (type === 'cursor') {
      for (const [nodeId, pos] of keyPositionMaps.blockCode.entries()) {
        const contentStartOffset = pos.content.start.offset
        const contentEndOffset = pos.content.end.offset
        const headStartOffset = pos.head.start.offset
        const headEndOffset = pos.head.end.offset
        const tailStartOffset = pos.tail.start.offset
        const tailEndOffset = pos.tail.end.offset
        const nextCursorOffset = cursorOffset.value - 1
        if (nextCursorOffset >= headStartOffset && nextCursorOffset < headEndOffset) {
          // 是否在开头
          deleteBlockCodeEnclosure(nodeId, pos)
          selector.setPosition(headStartOffset, headStartOffset)
          selector.setCursorOffset(headStartOffset)
          return true
        } else if (nextCursorOffset >= tailStartOffset && nextCursorOffset <= tailEndOffset) {
          // 是否在结尾
          deleteBlockCodeEnclosure(nodeId, pos)
          const nextOffset = tailStartOffset - (headEndOffset - headStartOffset)
          selector.setPosition(nextOffset, nextOffset)
          selector.setCursorOffset(nextOffset)
          return true
        } else if (
          cursorOffset.value === contentStartOffset + 1 &&
          contentEndOffset - contentStartOffset === 1
        ) {
          // 内容是否为空
          deleteBlockCodeEnclosure(nodeId, pos)
          selector.setPosition(headStartOffset, headStartOffset)
          selector.setCursorOffset(headStartOffset)
          return true
        }
      }
    } else if (type === 'range') {
      for (const [nodeId, pos] of keyPositionMaps.blockCode.entries()) {
        const headStartOffset = pos.head.start.offset
        const headEndOffset = pos.head.end.offset
        const tailStartOffset = pos.tail.start.offset
        const tailEndOffset = pos.tail.end.offset
        if (startOffset <= headStartOffset && endOffset >= headStartOffset) {
          deleteBlockCodeEnclosure(nodeId, pos)
          selector.setPosition(headStartOffset, headStartOffset)
          selector.setCursorOffset(headStartOffset)
          return true
        } else if (startOffset <= tailStartOffset && endOffset >= tailEndOffset) {
          deleteBlockCodeEnclosure(nodeId, pos)
          const nextOffset = tailStartOffset - (headEndOffset - headStartOffset)
          selector.setPosition(nextOffset, nextOffset)
          selector.setCursorOffset(nextOffset)
          return true
        }
      }
    }
    return false
  }

  const handleCopy = () => {
    const {
      position: { startOffset, endOffset },
    } = selector
    const selectedText = source.value.slice(startOffset, endOffset)
    if (selectedText) {
      navigator.clipboard.writeText(selectedText)
    }
  }

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault()
    if (e.clipboardData) {
      const pastedText = e.clipboardData.getData('text/plain')
      // console.log(pastedText)
      handleInsert(pastedText)
    }
  }

  const handleInsert = (key: string) => {
    const {
      position: { startOffset, endOffset },
      cursorOffset,
    } = selector
    // console.log(`handleInsert[${startOffset}, ${endOffset}]`)

    // 如果有有效选区（包括光标位置）
    if (startOffset !== -1 && endOffset !== -1) {
      const before = source.value.slice(0, startOffset)
      // console.log(before)
      const after = source.value.slice(endOffset)

      if (startOffset === endOffset) {
        // 显示光标
        if (key === '\n') {
          if (handleNewlineInCodeBlock(before, after)) return
        }

        source.value = before + key + after
        selector.setPosition(startOffset + key.length, startOffset + key.length)
        selector.setCursorOffset(cursorOffset.value + key.length)
      } else {
        // 显示选定的区域
        source.value = before + key + after
        const newOffset = startOffset + key.length
        selector.setPosition(newOffset, newOffset)
        selector.setCursorOffset(newOffset)
      }
    }

    // 记录状态
    record()
  }

  function handleNewlineInCodeBlock(before: string, after: string) {
    const {
      position: { startOffset },
      cursorOffset,
    } = selector
    for (const pos of keyPositionMaps.blockCode.values()) {
      if (cursorOffset.value === pos.content.end.offset) {
        source.value = before + '\n ' + after
        selector.setPosition(startOffset + 1, startOffset + 1)
        selector.setCursorOffset(cursorOffset.value + 1)
        return true
      }
    }
    return false
  }

  const handleArrow = (e: string) => {
    console.log('handleArrow: ', e)
    switch (e) {
      case 'ArrowLeft':
        moveCursorHorizontally(-1)
        break
      case 'ArrowRight':
        moveCursorHorizontally(1)
        break
      case 'ArrowUp':
        moveCursorVertically(-1)
        break

      case 'ArrowDown':
        moveCursorVertically(1)
        break
    }
  }

  function moveCursorHorizontally(direction: -1 | 1) {
    const {
      cursorOffset,
      position: { startOffset, endOffset },
    } = selector

    // 边界检查
    if (direction === -1 && cursorOffset.value === 0) return
    if (direction === 1 && cursorOffset.value === source.value.length) return

    if (startOffset === endOffset) {
      // 光标模式（无选区）
      if (direction === -1) {
        if (checkMoveCursorLeftBlockCode('cursor')) return
      } else {
        if (checkMoveCursorRightBlockCode('cursor')) return
      }

      const newOffset = cursorOffset.value + direction
      selector.setCursorOffset(newOffset)
      selector.setPosition(newOffset, newOffset)
    } else {
      // 选区模式
      let newOffset: number
      if (direction === -1) {
        if (checkMoveCursorLeftBlockCode('range')) return
        newOffset = startOffset // 移动到选区起点
      } else {
        if (checkMoveCursorRightBlockCode('range')) return
        newOffset = endOffset // 移动到选区终点
      }

      selector.setCursorOffset(newOffset)
      selector.setPosition(newOffset, newOffset)
    }
  }

  function moveCursorVertically(direction: -1 | 1) {
    const {
      cursorOffset,
      visualColumn,
      position: { startOffset, endOffset },
    } = selector
    if (startOffset !== endOffset) {
      moveCursorHorizontally(direction)
      return
    }

    const lines = source.value.split(/\r?\n/)
    if (lines.length === 0) return

    // 将当前 offset 转为 lineIndex, column
    const { lineIndex, column } = offsetToLineColumn(cursorOffset.value, lines)

    // 更新 visualColumn
    if (startOffset === endOffset) {
      visualColumn.value = column
    }

    // 目标行
    let targetLineIndex = lineIndex + direction
    if (targetLineIndex < 0 || targetLineIndex >= lines.length) {
      return // 超出文档范围
    }

    // 获取目标行列数（clamp 到行长度）
    const targetLine = lines[targetLineIndex]
    const targetColumn = Math.min(visualColumn.value, targetLine.length)

    // 转回全局 offset
    let newOffset = lineColumnToOffset(targetLineIndex, targetColumn, lines)

    if (isOffsetInBlockCodeFence(newOffset)) {
      targetLineIndex += direction
      const nextLine = lines[targetLineIndex]
      const nextColumn = Math.min(visualColumn.value, nextLine.length)
      newOffset = lineColumnToOffset(targetLineIndex, nextColumn, lines)
    }

    // 更新光标（无论是否选区，都取消选区并移动）
    selector.setCursorOffset(newOffset)
    selector.setPosition(newOffset, newOffset)
  }

  function offsetToLineColumn(
    offset: number,
    lines: string[]
  ): { lineIndex: number; column: number } {
    let currentOffset = 0

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length
      const lineEnd = currentOffset + lineLength

      if (offset <= lineEnd) {
        return { lineIndex: i, column: offset - currentOffset }
      }

      currentOffset += lineLength + 1 // +1 for \n
    }

    // 超出范围 → 最后一行末尾
    return { lineIndex: lines.length - 1, column: lines[lines.length - 1]?.length ?? 0 }
  }

  function lineColumnToOffset(lineIndex: number, column: number, lines: string[]): number {
    let offset = 0
    for (let i = 0; i < lineIndex; i++) {
      offset += lines[i].length + 1
    }
    return offset + Math.min(column, lines[lineIndex]?.length ?? 0)
  }

  function isOffsetInBlockCodeFence(offset: number) {
    for (const pos of keyPositionMaps.blockCode.values()) {
      // 检查是否在 head 行（围栏开始行）
      if (offset >= pos.head.start.offset && offset <= pos.head.end.offset) {
        return true
      }
      // 检查是否在 tail 行（围栏结束行）
      if (offset >= pos.tail.start.offset && offset <= pos.tail.end.offset) {
        return true
      }
    }
    return false
  }

  function checkMoveCursorLeftBlockCode(type: 'cursor' | 'range') {
    const {
      position: { startOffset },
      cursorOffset,
    } = selector
    const nextCursorOffset = cursorOffset.value - 1
    if (type === 'cursor') {
      for (const pos of keyPositionMaps.blockCode.values()) {
        const headStartOffset = pos.head.start.offset
        const contentStartOffset = pos.content.start.offset
        const tailStartOffset = pos.tail.start.offset
        const tailEndOffset = pos.tail.end.offset

        if (cursorOffset.value === contentStartOffset) {
          selector.setPosition(headStartOffset - 1, headStartOffset - 1)
          selector.setCursorOffset(headStartOffset - 1)
          return true
        } else if (nextCursorOffset === tailEndOffset) {
          selector.setPosition(tailStartOffset, tailStartOffset)
          selector.setCursorOffset(tailStartOffset)
          return true
        }
      }
    } else if (type === 'range') {
      for (const pos of keyPositionMaps.blockCode.values()) {
        const headStartOffset = pos.head.start.offset
        const contentStartOffset = pos.content.start.offset
        const tailStartOffset = pos.tail.start.offset
        const tailEndOffset = pos.tail.end.offset
        if (startOffset === contentStartOffset) {
          selector.setPosition(headStartOffset - 1, headStartOffset - 1)
          selector.setCursorOffset(headStartOffset - 1)
          return true
        } else if (startOffset - 1 === tailEndOffset) {
          selector.setPosition(tailStartOffset, tailStartOffset)
          selector.setCursorOffset(tailStartOffset)
          return true
        }
      }
    }

    return false
  }

  function checkMoveCursorRightBlockCode(type: 'cursor' | 'range') {
    const {
      position: { endOffset },
      cursorOffset,
    } = selector
    const nextCursorOffset = cursorOffset.value + 1
    if (type === 'cursor') {
      for (const pos of keyPositionMaps.blockCode.values()) {
        const headStartOffset = pos.head.start.offset
        const contentStartOffset = pos.content.start.offset
        const tailStartOffset = pos.tail.start.offset
        const tailEndOffset = pos.tail.end.offset
        if (nextCursorOffset === headStartOffset) {
          selector.setPosition(contentStartOffset, contentStartOffset)
          selector.setCursorOffset(contentStartOffset)
          return true
        } else if (cursorOffset.value === tailStartOffset) {
          selector.setPosition(tailEndOffset + 1, tailEndOffset + 1)
          selector.setCursorOffset(tailEndOffset + 1)
          return true
        }
      }
    } else {
      for (const pos of keyPositionMaps.blockCode.values()) {
        const headStartOffset = pos.head.start.offset
        const contentStartOffset = pos.content.start.offset
        const tailStartOffset = pos.tail.start.offset
        const tailEndOffset = pos.tail.end.offset
        if (endOffset + 1 === headStartOffset) {
          selector.setPosition(contentStartOffset, contentStartOffset)
          selector.setCursorOffset(contentStartOffset)
          return true
        } else if (endOffset === tailStartOffset) {
          selector.setPosition(tailEndOffset + 1, tailEndOffset + 1)
          selector.setCursorOffset(tailEndOffset + 1)
          return true
        }
      }
    }
    return false
  }

  // 删除代码块的围栏
  function deleteBlockCodeEnclosure(nodeId: number, pos: BlockCodePosInfo) {
    const before = source.value.slice(0, pos.head.start.offset)
    const content = source.value.slice(pos.content.start.offset, pos.content.end.offset)
    const after = source.value.slice(pos.tail.end.offset)
    source.value = before + content + after
    keyPositionMaps.blockCode.delete(nodeId)
  }

  return {
    source,
    handleKeydown,
    handlePaste,
    handleInsert,
    handleDelete,
    handleCompositionUpdate,
    record,
    handleInsertKeyChars,
  }
}
