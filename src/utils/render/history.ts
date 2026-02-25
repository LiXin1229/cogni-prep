import type { Ref } from 'vue'
import type { SelectionPosition, Selector } from './select'

export type HistoryEntry = {
  source: string
  position: SelectionPosition
  cursorOffset: number
}

export type History = {
  record: () => void
  reset: (source?: string) => void
  undo: () => void
  redo: () => void
}

export function setupHistoryStack(source: Ref<string>, selector: Selector): History {
  const history: HistoryEntry[] = []
  let currIndex = 0

  const push = () => {
    history.push({
      source: source.value,
      position: {
        startOffset: selector.position.startOffset,
        endOffset: selector.position.endOffset,
      },
      cursorOffset: selector.cursorOffset.value,
    })
  }
  push()

  // 恢复 currIndex 状态
  const recover = () => {
    const historyEntry = history[currIndex]
    source.value = historyEntry.source
    selector.setCursorOffset(historyEntry.cursorOffset)
    selector.setPosition(historyEntry.position.startOffset, historyEntry.position.endOffset)
  }

  // 记录当前状态
  const record = () => {
    history.length = currIndex + 1
    push()
    currIndex++
  }

  // ctrl + z
  const undo = () => {
    if (currIndex > 0) {
      currIndex--
      recover()
    }
    // console.log('undo res: ', source.value)
  }

  // ctrl + y
  const redo = () => {
    if (currIndex < history.length - 1) {
      currIndex++
      recover()
    }
  }

  // 回退到初始状态
  const reset = (source?: string) => {
    if (source) {
      history.push({
        source,
        position: {
          startOffset: -1,
          endOffset: -1,
        },
        cursorOffset: -1,
      })
    } else {
      history.push(history[0])
    }
    currIndex++
    recover()
  }

  return {
    record,
    reset,
    undo,
    redo,
  }
}
