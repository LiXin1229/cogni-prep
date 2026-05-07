import { nextTick } from 'vue'
import type { EditorRef } from '.'
import type { Editor } from './edit'
import type { Selector } from './select'

export type InputHandler = {
  cleanup: () => void
}

export function setupInputHandler(
  editorRef: EditorRef,
  editor: Editor,
  selector: Selector
): InputHandler {
  let isComposing = false
  let compositionStartOffset: number | null = null
  const listeners: Array<() => void> = []

  nextTick(() => {
    initListeners()
  })

  const getEditContainer = (): HTMLElement | null => {
    if (!editorRef.value) return null
    return editorRef.value.querySelector('.edit-container')
  }

  const initListeners = () => {
    const editContainer = getEditContainer()
    if (!editContainer) return

    const onBeforeInput = (e: InputEvent) => {
      e.preventDefault()
      if (isComposing) return

      const { inputType, data } = e
      if (!data) return

      switch (inputType) {
        case 'insertText':
          editor.handleInsert(data)
          break
        case 'insertParagraph':
        case 'insertLineBreak':
          editor.handleInsert('\n')
          break
        case 'deleteContentBackward':
          editor.handleDelete()
          break
        case 'insertFromPaste':
          break
      }
    }

    const onCompositionStart = () => {
      isComposing = true
      const { startOffset, endOffset } = selector.position
      if (startOffset !== endOffset) {
        editor.handleDelete()
      }
      compositionStartOffset = selector.cursorOffset.value
    }

    const onCompositionEnd = (e: CompositionEvent) => {
      const finalText = e.data || ''
      if (finalText && compositionStartOffset !== null) {
        editor.handleCompositionUpdate(compositionStartOffset, finalText)
        editor.record()
      }
      compositionStartOffset = null
      isComposing = false
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isComposing) return

      if (e.ctrlKey) {
        editor.handleKeydown(e)
        return
      }

      const controlKeys = [
        'Backspace',
        'Delete',
        'Enter',
        'Tab',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
      ]

      if (controlKeys.includes(e.key)) {
        e.preventDefault()
        editor.handleKeydown(e)
      }
    }

    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault()
      editor.handlePaste(e)
    }

    editContainer.addEventListener('beforeinput', onBeforeInput as EventListener)
    editContainer.addEventListener('compositionstart', onCompositionStart)
    editContainer.addEventListener('compositionend', onCompositionEnd)
    editContainer.addEventListener('keydown', onKeyDown)
    editContainer.addEventListener('paste', onPaste)

    listeners.push(() => {
      editContainer.removeEventListener('beforeinput', onBeforeInput as EventListener)
      editContainer.removeEventListener('compositionstart', onCompositionStart)
      editContainer.removeEventListener('compositionend', onCompositionEnd)
      editContainer.removeEventListener('keydown', onKeyDown)
      editContainer.removeEventListener('paste', onPaste)
    })
  }

  const cleanup = () => {
    listeners.forEach((removeListener) => removeListener())
    listeners.length = 0
  }

  return {
    cleanup,
  }
}
